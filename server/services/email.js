import nodemailer from 'nodemailer';

const smtpConfigured = process.env.EMAIL_USER && process.env.EMAIL_APP_PASSWORD;
const transporter = smtpConfigured
  ? nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_APP_PASSWORD,
      },
    })
  : null;

export async function sendOrderConfirmation({ recipient, customerName, order }) {
  if (!transporter || !recipient) {
    console.warn('Order email skipped: configure EMAIL_USER and EMAIL_APP_PASSWORD in .env.');
    return;
  }

  await transporter.sendMail({
    from: `Thrift Apparel <${process.env.EMAIL_USER}>`,
    to: recipient,
    subject: `Order confirmed: ${order.order_number}`,
    text: `Hi ${customerName || 'there'},\n\nThanks for your order.\n\nOrder: ${order.order_number}\nTotal: PHP ${Number(order.total_amount).toLocaleString()}\nStatus: ${order.status}\nShipping address: ${order.shipping_address}\n\nYou can track your order at http://localhost:5173/orders.\n\nThrift Apparel`,
    html: `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#171717"><h1>Thanks for your order.</h1><p>Hi ${customerName || 'there'}, your order is confirmed and being prepared.</p><p><strong>Order:</strong> ${order.order_number}<br><strong>Total:</strong> PHP ${Number(order.total_amount).toLocaleString()}<br><strong>Status:</strong> ${order.status}</p><p><strong>Shipping address:</strong><br>${order.shipping_address}</p><p>Track your order at <a href="http://localhost:5173/orders">My Orders</a>.</p><p>Thrift Apparel</p></div>`,
  });
}
