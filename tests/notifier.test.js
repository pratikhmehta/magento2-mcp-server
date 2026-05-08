import { sendAlert } from '../src/handlers/notifier.js';
import nodemailer from 'nodemailer';
import axios from 'axios';

jest.mock('nodemailer');
jest.mock('axios');

describe('Notifier Handler', () => {
  const mockAlert = {
    type: 'low_stock',
    subject: 'Low Stock: SHIRT-01',
    body: 'Only 2 left in warehouse.',
    data: { sku: 'SHIRT-01' }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.ALERT_EMAIL = 'admin@test.com';
    process.env.SMTP_HOST = 'smtp.test.com';
    process.env.SMTP_USER = 'user';
    process.env.SMTP_PASS = 'pass';
    process.env.SLACK_WEBHOOK_URL = 'https://slack.com/hook';
    process.env.ALERT_WEBHOOK_URL = 'https://webhook.com/alert';
  });

  test('low_stock alerts should trigger email and slack', async () => {
    const sendMailMock = jest.fn().mockResolvedValue({});
    nodemailer.createTransport.mockReturnValue({ sendMail: sendMailMock });
    axios.post.mockResolvedValue({});

    await sendAlert(mockAlert);

    expect(nodemailer.createTransport).toHaveBeenCalled();
    expect(sendMailMock).toHaveBeenCalledWith(expect.objectContaining({ to: 'admin@test.com' }));
    expect(axios.post).toHaveBeenCalledWith('https://slack.com/hook', expect.anything());
  });

  test('order_event alerts should trigger only webhook', async () => {
    const orderAlert = { ...mockAlert, type: 'order_event' };
    axios.post.mockResolvedValue({});

    await sendAlert(orderAlert);

    expect(nodemailer.createTransport).not.toHaveBeenCalled();
    expect(axios.post).toHaveBeenCalledWith('https://webhook.com/alert', expect.anything());
  });

  test('should skip channels if environment variables are missing', async () => {
    delete process.env.SLACK_WEBHOOK_URL;
    delete process.env.SMTP_HOST;
    
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

    await sendAlert(mockAlert);

    expect(axios.post).not.toHaveBeenCalled();
    expect(nodemailer.createTransport).not.toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('skipped'));
    
    consoleSpy.mockRestore();
  });
});
