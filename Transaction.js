// transaction.js
const mysql = require('mysql2/promise');
const nodemailer = require('nodemailer');
const config = require('./config');

async function executePOS() {
    // Step 2: Collect shopping items, shipping and CX information:
    const items = ['BL0001', 'SP0004'];
    const customerAddress = "45 Princes St, Edinburgh EH10 7TG";
    const couponCode = "XYZ123";
    const customerEmail = "niamh@clarktribe.co.uk"; // Replace with the actual email

    const connection = await mysql.createConnection(config.db);
    await connection.execute('SET TRANSACTION ISOLATION LEVEL READ COMMITTED');
    console.log('Isolation level has been set to READ COMMITTED');
    
    // Start the real SQL transaction:
    await connection.beginTransaction();
    try {
        await connection.execute('SELECT id, name FROM products WHERE code IN (?, ?) FOR UPDATE', items);
        console.log(`Locked rows for codes ${items.join()}`);
        const [itemsToOrder] = await connection.execute(
            'SELECT name, stock, price FROM products WHERE code IN (?, ?) ORDER BY id', items
        );
        console.log('Selected stock quantities for items');

        // Step 3: Calculate order price
        let orderTotal = 0.0; // Ensure this is a numeric value
        let orderItems = [];
        for (const itemToOrder of itemsToOrder) {
            if (itemToOrder.stock < 1) {
                throw new Error(`One of the items is out of stock: ${itemToOrder.name}`);
            }
            console.log(`Stock for ${itemToOrder.name} is ${itemToOrder.stock}`);
            orderTotal += parseFloat(itemToOrder.price); // Ensure price is treated as a number
            orderItems.push(itemToOrder.name);
        }
        await connection.execute(
            'INSERT INTO orders (items, total) VALUES (?, ?)', 
            [orderItems.join(), orderTotal]
        );
        console.log(`Order created`);

        // Step 4: Update product inventory
        await connection.execute(
            `UPDATE products SET stock = stock - 1 WHERE code IN (?, ?)`, items
        );
        console.log(`Deducted stock by 1 for ${items.join()}`);

        // Step 8: Send confirmation email
        await sendConfirmationEmail(customerEmail, orderItems, orderTotal);
        console.log('Confirmation email sent');

        // Step 9: Commit the transaction
        await connection.commit();
        const [rows] = await connection.execute('SELECT LAST_INSERT_ID() as order_id');
        return `Order created with ID ${rows[0].order_id}`;
    } catch (err) {
        // Step 10: Rollback the transaction
        console.error(`Error occurred while creating order: ${err.message}`, err);
        await connection.rollback();
        console.info('Rollback successful');
        return 'Error creating order';
    }
}

async function sendConfirmationEmail(to, items, total) {
    let transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: config.email.user,
            pass: config.email.pass,
        },
    });

    let mailOptions = {
        from: config.email.user,
        to,
        subject: 'Order & Payment Confirmation',
        text: `Thank you for your order. You ordered: ${items.join(', ')}. Total amount: $${total.toFixed(2)}.`,
    };

    await transporter.sendMail(mailOptions);
}

(async function testTransaction() {
    console.log(await executePOS());
    process.exit(0);
})();