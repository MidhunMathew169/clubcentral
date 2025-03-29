const Order = require('../../models/orderSchema');
const Coupon = require('../../models/couponSchema');
const Cart = require('../../models/cartSchema');
const Product = require('../../models/productSchema');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const fs = require('fs');

const salesReport = async (req,res) => {
    try {
        const {filter,startDate,endDate} = req.query;
        console.log('filter date:',filter,startDate,endDate);
        const currentPage = parseInt(req.query.page) || 1;
        const itemsPerPage = 8;
        
        let dateFilter = {};
        let currentDate = new Date();
        let startOfDate = new Date(currentDate.setHours(0,0,0,0));

        if(filter === 'daily') {
            dateFilter = { orderDate: { $gte: startOfDate}};
        }
        else if(filter === 'weekly'){
            const weekStartDate = new Date();
            weekStartDate.setDate(currentDate.getDate() - 7);
            dateFilter = { orderDate: { $gte: weekStartDate}};
        }
        else if(filter === 'monthly'){
            const monthStartDate = new Date();
            monthStartDate.setMonth(currentDate.getMonth() - 1);
            dateFilter = { orderDate: { $gte: monthStartDate}};
        }
        else if(filter === 'custom'){
            if(startDate && endDate){
            dateFilter = { orderDate: { $gte: new Date(startDate), $lte: new Date(endDate)}}
        }
        else {
            return res.status(400).json({message:'Start and end date are required'})
        }
    }

    console.log('date filtered is:',dateFilter);

        // Get total count of filtered orders for pagination
        const totalFilteredOrders = await Order.countDocuments(dateFilter);
        const totalPages = Math.ceil(totalFilteredOrders / itemsPerPage) || 1;
        const skip = (currentPage - 1) * itemsPerPage;

        // Fetch all orders for statistics (without pagination)
        const allOrders = await Order.find(dateFilter);
        
        console.log('allOrders:',allOrders.length);
        // Fetch paginated orders for display in the table
        const paginatedOrders = await Order.find(dateFilter)
            .populate('userId','firstname lastname')
            .populate('items.product','productName')
            .sort({orderDate: -1 })
            .skip(skip)
            .limit(itemsPerPage);

        console.log('paginatedOrders:',paginatedOrders.length);

        const cart = await Cart.find();

        // Calculate overall statistics from all orders (not just paginated ones)
        let overallSalesCount = 0;
        let overallOrderAmount = 0;
        let overallDiscount = 0;

        let todaySales = 0;
        let weeklySales = 0;
        let monthlySales = 0;

        if(allOrders.length > 0) {
            overallSalesCount = allOrders.length;

            allOrders.forEach((order) => {
                overallOrderAmount += order.finalAmount || 0;

                if(new Date(order.orderDate) >= startOfDate){
                    todaySales += order.finalAmount || 0;
                }

                const weekStartDate = new Date();
                weekStartDate.setDate(currentDate.getDate() - 7);
                if(new Date(order.orderDate) >= weekStartDate){
                    weeklySales += order.finalAmount || 0;
                }

                const monthStartDate = new Date();
                monthStartDate.setMonth(currentDate.getMonth() - 1);
                if(new Date(order.orderDate) >= monthStartDate){
                    monthlySales += order.finalAmount || 0;
                }
            });

            cart.forEach((cartItem)=>{
                overallDiscount += cartItem.discountAmount || 0;
            });
        }

        const totalSalesAmount = overallOrderAmount;

        res.render('admin/sales',{
            orders: paginatedOrders,
            cart,
            currentPage,
            totalPages,
            overallSalesCount,
            overallOrderAmount,
            overallDiscount,
            todaySales,
            weeklySales,
            monthlySales,
            totalSalesAmount,
            filter: filter || '',
            startDate: startDate || '',
            endDate: endDate || ''
        });

    } catch (error) {
        console.error('Error fetching orders:',error);
        res.status(500).json({message:'error fetching sales report'});
    }
}

const exportSalesReportToExcel = async (req,res) => {
    try {
        const {filter,startDate,endDate} = req.query;
        console.log('filter:',req.query);

        let dateFilter = {};
        let currentDate = new Date();
        let startOfDate = new Date(currentDate.setHours(0,0,0,0));
        
        if(filter === 'daily'){
            dateFilter = {orderDate: {$gte: startOfDate}}
        }
        else if(filter === 'weekly'){
            const weekStartDate = new Date();
            weekStartDate.setDate(weekStartDate.getDate() - 7);
            dateFilter = {orderDate: {$gte: weekStartDate}}
        }
        else if(filter === 'monthly'){
            const monthStartDate = new Date();
            monthStartDate.setMonth(monthStartDate.getMonth() - 1);
            dateFilter = {orderDate: {$gte: monthStartDate}}
        }
        else if(filter === 'custom'){
            if(startDate && endDate){
                dateFilter = { orderDate: { $gte: new Date(startDate), $lte: new Date(endDate)}}
            }
            else{
                return res.status(400).json({message:'Start and end date are required'})
            }
        }
        const orders = await Order.find(dateFilter)
        .populate('userId','firstname lastname email')
        .populate('items.product','productName price')
        .sort({orderDate: -1});

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Sales Report');

        //add report title and filter info
        worksheet.mergeCells('A1:G1');
        const titleCell = worksheet.getCell('A1');
        titleCell.value = 'Club Central Sales Report';
        titleCell.font = { size: 16, bold: true };
        titleCell.alignment = { horizontal: 'center' };

        //add filter info
        worksheet.mergeCells('A2:G2');
        const filterCell = worksheet.getCell('A2');
        if (filter === 'daily') {
            filterCell.value = `Daily Report - ${new Date().toLocaleDateString()}`;
        } else if (filter === 'weekly') {
            filterCell.value = 'Weekly Report - Last 7 Days';
        } else if (filter === 'monthly') {
            filterCell.value = 'Monthly Report - Last 30 Days';
        } else if (filter === 'yearly') {
            filterCell.value = 'Yearly Report - Last 365 Days';
        } else if (filter === 'custom' && startDate && endDate) {
            filterCell.value = `Custom Report - From ${new Date(startDate).toLocaleDateString()} to ${new Date(endDate).toLocaleDateString()}`;
        } else {
            filterCell.value = 'All Sales Report';
        }
        filterCell.font = { size: 12, italic: true };
        filterCell.alignment = { horizontal: 'center' };

        //add empty row
        worksheet.addRow([]);

        worksheet.columns = [
            { header: 'Order ID', key: 'orderId', width: 20},
            { header: 'Date', key: 'date', width: 15},
            { header: 'Customer', key: 'customer', width: 25},
            { header: 'Product', key: 'product', width: 25},
            { header: 'Quantity', key: 'quantity', width: 10},
            { header: 'Unit Price', key: 'unitPrice', width: 15},
            { header: 'Final Amount', key: 'finalAmount', width: 15}

        ];

        //add data rows
        let totalAmount = 0;
        let totalQuantity = 0;
        let totalOrders = await Order.countDocuments(dateFilter);

        orders.forEach((order)=>{
            if(order.items && order.items.length > 0){
                order.items.forEach((item)=>{
                    try {
                        const orderedDate = order.orderDate;
                        console.log('orderedDate:',orderedDate);
                        const formattedDate = orderedDate ? new Date(orderedDate).toLocaleDateString() : 'N/A';
                        const customerName = order.userId ? `${order.userId.firstname || ''} ${order.userId.lastname || ''}`.trim() : 'Unknown Customer';
                        const productName = item.product && item.product.productName ? item.product.productName : 'Unknown Product';
                        

                        worksheet.addRow({
                            orderId : order.orderId ||order._id.toString(),
                            date : formattedDate,
                            customer : customerName,
                            product : productName,
                            quantity : item.quantity || 0,
                            unitPrice : item.price || 0,
                            finalAmount : item.quantity * item.price
                        })

                        totalAmount += item.quantity * item.price;
                        totalQuantity += item.quantity;
                        console.log('total amount:',totalAmount);
                    } catch (error) {
                        console.error('Error adding row to worksheet:',error);
                    }
                    
                });
            }
        });

        //add summary section
        // worksheet.addRow([]);
        // worksheet.addRow(['Total Orders', totalOrders]);
        // worksheet.addRow(['Total Items', totalQuantity]);
        // worksheet.addRow(['Total Amount', totalAmount]);

        const filename = `sales_report_${new Date().toISOString().split('T')[0]}.xlsx`;

        res.setHeader('Content-Type','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition',`attachment; filename="${filename}"`);

        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        console.error('Error exporting sales report:',error);
        res.status(500).json({message:'Error exporting sales report'});
    }
};

const exportSalesReportToPDF = async (req, res) => {
    try {
        const {filter, startDate, endDate} = req.query;
        console.log('PDF export filter:', filter, startDate, endDate);
        
        let dateFilter = {};
        let currentDate = new Date();
        let startOfDate = new Date(currentDate.setHours(0,0,0,0));

        if(filter === 'daily') {
            dateFilter = { orderDate: { $gte: startOfDate}};
        }
        else if(filter === 'weekly'){
            const weekStartDate = new Date();
            weekStartDate.setDate(currentDate.getDate() - 7);
            dateFilter = { orderDate: { $gte: weekStartDate}};
        }
        else if(filter === 'monthly'){
            const monthStartDate = new Date();
            monthStartDate.setMonth(currentDate.getMonth() - 1);
            dateFilter = { orderDate: { $gte: monthStartDate}};
        }
        else if(filter === 'yearly'){
            const yearStartDate = new Date();
            yearStartDate.setFullYear(currentDate.getFullYear() - 1);
            dateFilter = { orderDate: { $gte: yearStartDate}};
        }
        else if(filter === 'custom'){
            if(startDate && endDate){
                const endDateObj = new Date(endDate);
                endDateObj.setDate(endDateObj.getDate() + 1);
                
                dateFilter = { 
                    orderDate: { 
                        $gte: new Date(startDate), 
                        $lte: endDateObj
                    }
                };
            }
        }

        console.log('PDF export date filter:', dateFilter);

        const orders = await Order.find(dateFilter)
        .populate('userId','firstname lastname email')
        .populate('items.product','productName price')
        .sort({orderDate: -1});

        // Create a new PDF document
        const doc = new PDFDocument({
            size: 'A4',
            margin: 50
        });

        const filename = `sales_report_${new Date().toISOString().split('T')[0]}.pdf`;

        // Set response headers
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

        // Pipe the PDF document to the response
        doc.pipe(res);

        // Add the report title
        doc.fontSize(20).text('Club Central Sales Report', {
            align: 'center'
        });
        
        // Add filter information
        doc.moveDown();
        if (filter === 'daily') {
            doc.fontSize(12).text(`Daily Report - ${new Date().toLocaleDateString()}`, {
                align: 'center',
                italic: true
            });
        } else if (filter === 'weekly') {
            doc.fontSize(12).text('Weekly Report - Last 7 Days', {
                align: 'center',
                italic: true
            });
        } else if (filter === 'monthly') {
            doc.fontSize(12).text('Monthly Report - Last 30 Days', {
                align: 'center',
                italic: true
            });
        } else if (filter === 'yearly') {
            doc.fontSize(12).text('Yearly Report - Last 365 Days', {
                align: 'center',
                italic: true
            });
        } else if (filter === 'custom' && startDate && endDate) {
            doc.fontSize(12).text(`Custom Report - From ${new Date(startDate).toLocaleDateString()} to ${new Date(endDate).toLocaleDateString()}`, {
                align: 'center',
                italic: true
            });
        } else {
            doc.fontSize(12).text('All Sales Report', {
                align: 'center',
                italic: true
            });
        }
        
        doc.moveDown(2);

        // Calculate totals
        let totalAmount = 0;
        let totalQuantity = 0;
        let totalOrders = orders.length;

        // Add table headers
        const tableTop = 150;
        const tableHeaders = ['Order ID', 'Date', 'Customer', 'Product', 'Qty', 'Price', 'Amount'];
        const tableColumnWidths = [80, 70, 100, 100, 40, 60, 70];
        
        // Draw table headers
        let currentX = 50;
        doc.font('Helvetica-Bold').fontSize(10);
        
        tableHeaders.forEach((header, i) => {
            doc.text(header, currentX, tableTop, {
                width: tableColumnWidths[i],
                align: 'left'
            });
            currentX += tableColumnWidths[i];
        });
        
        // Draw a line under the headers
        doc.moveTo(50, tableTop + 15)
           .lineTo(550, tableTop + 15)
           .stroke();
        
        // Add table rows
        let currentY = tableTop + 25;
        doc.font('Helvetica').fontSize(9);
        
        // Process each order
        orders.forEach((order) => {
            if(order.items && order.items.length > 0) {
                order.items.forEach((item) => {
                    try {
                        // Check if we need a new page
                        if (currentY > 700) {
                            doc.addPage();
                            currentY = 50;
                            
                            // Redraw headers on new page
                            currentX = 50;
                            doc.font('Helvetica-Bold').fontSize(10);
                            
                            tableHeaders.forEach((header, i) => {
                                doc.text(header, currentX, currentY, {
                                    width: tableColumnWidths[i],
                                    align: 'left'
                                });
                                currentX += tableColumnWidths[i];
                            });
                            
                            // Draw a line under the headers
                            doc.moveTo(50, currentY + 15)
                               .lineTo(550, currentY + 15)
                               .stroke();
                               
                            currentY += 25;
                            doc.font('Helvetica').fontSize(9);
                        }
                        
                        const orderedDate = order.orderDate;
                        const formattedDate = orderedDate ? new Date(orderedDate).toLocaleDateString() : 'N/A';
                        const customerName = order.userId ? `${order.userId.firstname || ''} ${order.userId.lastname || ''}`.trim() : 'Unknown';
                        const productName = item.product && item.product.productName ? item.product.productName : 'Unknown';
                        const quantity = item.quantity || 0;
                        const price = item.price || 0;
                        const amount = quantity * price;
                        
                        // Add to totals
                        totalAmount += amount;
                        totalQuantity += quantity;
                        
                        // Draw row
                        currentX = 50;
                        doc.text(order.orderId || order._id.toString().substring(0, 8), currentX, currentY, {
                            width: tableColumnWidths[0],
                            align: 'left'
                        });
                        currentX += tableColumnWidths[0];
                        
                        doc.text(formattedDate, currentX, currentY, {
                            width: tableColumnWidths[1],
                            align: 'left'
                        });
                        currentX += tableColumnWidths[1];
                        
                        doc.text(customerName, currentX, currentY, {
                            width: tableColumnWidths[2],
                            align: 'left'
                        });
                        currentX += tableColumnWidths[2];
                        
                        doc.text(productName, currentX, currentY, {
                            width: tableColumnWidths[3],
                            align: 'left'
                        });
                        currentX += tableColumnWidths[3];
                        
                        doc.text(quantity.toString(), currentX, currentY, {
                            width: tableColumnWidths[4],
                            align: 'left'
                        });
                        currentX += tableColumnWidths[4];
                        
                        doc.text(`₹${price.toFixed(2)}`, currentX, currentY, {
                            width: tableColumnWidths[5],
                            align: 'left'
                        });
                        currentX += tableColumnWidths[5];
                        
                        doc.text(`₹${amount.toFixed(2)}`, currentX, currentY, {
                            width: tableColumnWidths[6],
                            align: 'left'
                        });
                        
                        currentY += 20;
                    } catch (error) {
                        console.error('Error adding row to PDF:', error);
                    }
                });
            }
        });
        
        // Draw a line after the data
        doc.moveTo(50, currentY)
           .lineTo(550, currentY)
           .stroke();
           
        // Add summary section
        currentY += 20;
        doc.font('Helvetica-Bold').fontSize(10);
        
        doc.text('Summary:', 50, currentY);
        currentY += 15;
        
        doc.text(`Total Orders: ${totalOrders}`, 50, currentY);
        currentY += 15;
        
        doc.text(`Total Items: ${totalQuantity}`, 50, currentY);
        currentY += 15;
        
        doc.text(`Total Amount: ₹${totalAmount.toFixed(2)}`, 50, currentY);
        
        // Add footer with date and page number
        const pageCount = doc.bufferedPageRange().count;
        for (let i = 0; i < pageCount; i++) {
            doc.switchToPage(i);
            
            // Add page number
            doc.fontSize(8).text(
                `Page ${i + 1} of ${pageCount}`,
                50,
                doc.page.height - 50,
                { align: 'center' }
            );
            
            // Add generation date
            doc.fontSize(8).text(
                `Generated on: ${new Date().toLocaleString()}`,
                50,
                doc.page.height - 35,
                { align: 'center' }
            );
        }
        
        // Finalize the PDF
        doc.end();
    } catch (error) {
        console.error('Error generating PDF report:', error);
        res.status(500).json({message: 'Error generating PDF report'});
    }
};

module.exports = {
    salesReport,
    exportSalesReportToExcel,
    exportSalesReportToPDF
}
