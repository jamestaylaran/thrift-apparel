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

const money = (value) => `PHP ${Number(value || 0).toLocaleString('en-PH')}`;

/**
 * Sends the purchase receipt after checkout.
 * `items` = [{ name, sku, quantity, price }]
 */
export async function sendOrderConfirmation({ recipient, customerName, order, items = [] }) {
  if (!transporter || !recipient) {
    console.warn('Order email skipped: configure EMAIL_USER and EMAIL_APP_PASSWORD in .env.');
    return;
  }

  const siteUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  const orderNumber = order.order_number || order.id;
  const orderedAt = order.created_at ? new Date(order.created_at).toLocaleString('en-PH') : '';
  const lines = items.map((item) => ({
    name: item.name || 'Item',
    sku: item.sku || '',
    quantity: Number(item.quantity) || 1,
    lineTotal: (Number(item.price) || 0) * (Number(item.quantity) || 1),
    price: Number(item.price) || 0,
  }));

  const rowsHtml = lines
    .map(
      (line) =>
        `<tr><td style="padding:8px;border-bottom:1px solid #e5e5e5">${line.name}${
          line.sku ? `<br><span style="color:#777;font-size:12px">SKU ${line.sku}</span>` : ''
        }</td><td style="padding:8px;border-bottom:1px solid #e5e5e5;text-align:center">${line.quantity}</td>` +
        `<td style="padding:8px;border-bottom:1px solid #e5e5e5;text-align:right">${money(line.price)}</td>` +
        `<td style="padding:8px;border-bottom:1px solid #e5e5e5;text-align:right">${money(line.lineTotal)}</td></tr>`,
    )
    .join('');

  const rowsText = lines
    .map((line) => `- ${line.name}${line.sku ? ` (${line.sku})` : ''} x${line.quantity} = ${money(line.lineTotal)}`)
    .join('\n');

  await transporter.sendMail({
    from: `Thrift Apparel <${process.env.EMAIL_USER}>`,
    to: recipient,
    subject: `Purchase receipt: ${orderNumber}`,
    text:
      `Hi ${customerName || 'there'},\n\nThanks for your purchase — here is your receipt.\n\n` +
      `Order: ${orderNumber}\n` +
      (orderedAt ? `Date: ${orderedAt}\n` : '') +
      `Status: ${order.status}\n\nItems:\n${rowsText}\n\n` +
      `Total: ${money(order.total_amount)}\n` +
      `Shipping address: ${order.shipping_address}\n` +
      (order.phone ? `Phone: ${order.phone}\n` : '') +
      `\nTrack your order at ${siteUrl}/orders\n\nThrift Apparel`,
    html: `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#171717;max-width:560px">
      <h1 style="margin:0 0 4px">Purchase receipt</h1>
      <p style="margin:0 0 16px;color:#555">Hi ${customerName || 'there'}, thanks for your order — here's your receipt.</p>
      <p style="margin:0 0 4px"><strong>Order:</strong> ${orderNumber}${orderedAt ? ` &nbsp;·&nbsp; <strong>Date:</strong> ${orderedAt}` : ''}<br>
      <strong>Status:</strong> ${order.status}</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;border:1px solid #e5e5e5">
        <thead><tr style="background:#f5f5f5">
          <th style="padding:8px;text-align:left">Item</th>
          <th style="padding:8px;text-align:center">Qty</th>
          <th style="padding:8px;text-align:right">Price</th>
          <th style="padding:8px;text-align:right">Amount</th>
        </tr></thead>
        <tbody>${rowsHtml}</tbody>
        <tfoot><tr>
          <td colspan="3" style="padding:10px 8px;text-align:right;font-weight:bold">Total</td>
          <td style="padding:10px 8px;text-align:right;font-weight:bold">${money(order.total_amount)}</td>
        </tr></tfoot>
      </table>
      <p style="margin:0 0 4px"><strong>Shipping address:</strong><br>${order.shipping_address}${
        order.phone ? `<br><strong>Phone:</strong> ${order.phone}` : ''
      }</p>
      <p style="margin:16px 0 0"><a href="${siteUrl}/orders">Track your order</a></p>
      <p style="color:#777;font-size:12px;margin-top:24px">Thrift Apparel</p>
    </div>`,
  });
}
