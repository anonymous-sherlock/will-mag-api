import nodemailer from "nodemailer";

import env from "@/env";

const transporter = nodemailer.createTransport({
  host: "smtp.ethereal.email",
  port: 587,
  secure: false,
  auth: {
    user: env.NODEMAILER_USER,
    pass: env.NODEMAILER_APP_PASSWORD,
  },
});

export default transporter;
