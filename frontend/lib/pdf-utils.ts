// frontend/lib/pdf-utils.ts
'use client';

export function downloadSimpleAnalyticsPDF(summary: { range: string; stats: Array<[string,string]> }) {
  const w = window.open('', '_blank');
  if (!w) {
    alert('Please allow popups to download the PDF');
    return;
  }
  const rows = summary.stats
    .map(([k, v]) => `<tr><td style="padding:8px;border:1px solid #e5e7eb;">${k}</td><td style="padding:8px;border:1px solid #e5e7eb;font-weight:600;">${v}</td></tr>`) 
    .join('');
  const html = `<!doctype html><html><head><title>Repruv Analytics (${summary.range})</title>
  <style>body{font-family:Arial,sans-serif;color:#111827;padding:24px} h1{color:#111827} .muted{color:#6b7280}</style>
  </head><body>
  <h1>Analytics Summary</h1>
  <div class="muted">Range: ${summary.range}</div>
  <table style="border-collapse:collapse;margin-top:16px;width:100%;">
    <tbody>${rows}</tbody>
  </table>
  <script>window.onload=function(){window.print();setTimeout(()=>window.close(),800);}</script>
  </body></html>`;
  w.document.write(html);
  w.document.close();
}

export const downloadTermsAsPDF = () => {
  // Create a new window with the terms content formatted for printing
  const printWindow = window.open('', '_blank');
  
  if (!printWindow) {
    alert('Please allow popups to download the PDF');
    return;
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Repruv - Terms and Conditions</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          max-width: 800px;
          margin: 40px auto;
          padding: 20px;
          color: #333;
        }
        h1 {
          color: #2563eb;
          border-bottom: 2px solid #2563eb;
          padding-bottom: 10px;
        }
        h2 {
          color: #1e40af;
          margin-top: 30px;
          margin-bottom: 15px;
        }
        h3 {
          color: #1e3a8a;
          margin-top: 20px;
        }
        ul {
          margin: 10px 0;
          padding-left: 20px;
        }
        li {
          margin: 8px 0;
        }
        .contact {
          background-color: #f3f4f6;
          padding: 15px;
          border-radius: 5px;
          margin-top: 20px;
        }
        @media print {
          body { margin: 0; }
        }
      </style>
    </head>
    <body>
      <h1>Terms and Conditions for Repruv</h1>
      
      <h3>Introduction</h3>
      <p>These Terms and Conditions ("Agreement") govern your use of Repruv, including its services related to reputation management across multiple platforms such as Google, TrustPilot, Facebook, Instagram, and more. By accessing or using our platform, you agree to be bound by these Terms.</p>
      
      <h2>1. Description of Services</h2>
      <p>Repruv provides a suite of reputation management tools, including:</p>
      <ul>
        <li><strong>Review Management:</strong> Centralizing and managing reviews from platforms like Google, TrustPilot, and others.</li>
        <li><strong>AI-Powered Responses:</strong> Automatically generating personalized responses to reviews and feedback using AI.</li>
        <li><strong>Competitor Tracking:</strong> Monitoring competitors' reviews and social media activity to help benchmark your brand.</li>
        <li><strong>Social Monitoring:</strong> Tracking social media mentions and comments across major platforms.</li>
        <li><strong>Analytics & Reports:</strong> Providing insights based on review data, sentiment analysis, and performance.</li>
        <li><strong>Team Collaboration:</strong> Enabling internal communication and task management, including role-based permissions.</li>
      </ul>

      <h2>2. Account Registration</h2>
      <p>To access our services, you must create an account with Repruv. You agree to provide accurate and up-to-date information during the registration process and maintain the confidentiality of your account credentials.</p>

      <h2>3. Fees and Payment</h2>
      <ul>
        <li><strong>Subscription Fees:</strong> Access to certain features requires a subscription. The fees and billing terms will be outlined during the registration process.</li>
        <li><strong>Payment Terms:</strong> Payments are due as specified in the subscription details. Subscription fees are non-refundable unless specified otherwise.</li>
      </ul>

      <h2>4. Use of the Service</h2>
      <ul>
        <li><strong>User Obligations:</strong> You agree to use the services solely for lawful purposes and in accordance with our acceptable use policy. You are responsible for all content uploaded to our platform.</li>
        <li><strong>Prohibited Activities:</strong> You may not use the platform for spamming, violating third-party rights, or any unlawful activities. Misuse of the platform may result in account suspension or termination.</li>
      </ul>

      <h2>5. Intellectual Property</h2>
      <ul>
        <li><strong>Ownership:</strong> Repruv retains ownership of all intellectual property related to the platform, including logos, software, and content. You are granted a limited, non-transferable license to use the service.</li>
        <li><strong>User Content:</strong> You retain ownership of your content (reviews, feedback), but by using our services, you grant Repruv the right to process and distribute that content as part of the platform's functionality.</li>
      </ul>

      <h2>6. Data Privacy</h2>
      <p>Our Privacy Policy outlines how we collect, use, and protect your data. By using the platform, you agree to the terms of our Privacy Policy.</p>

      <h2>7. Termination</h2>
      <ul>
        <li><strong>By You:</strong> You may terminate your account at any time by following the account deletion procedure.</li>
        <li><strong>By Us:</strong> We may suspend or terminate your account if you violate these Terms or for any other reason at our discretion.</li>
      </ul>

      <h2>8. Limitation of Liability</h2>
      <ul>
        <li><strong>Limitation:</strong> Repruv will not be liable for any indirect, incidental, or consequential damages arising from your use of the platform.</li>
        <li><strong>No Guarantee:</strong> While we strive to provide accurate data and insights, we do not guarantee specific results from using our services.</li>
      </ul>

      <h2>9. Dispute Resolution</h2>
      <p>Any disputes arising from the use of Repruv will be resolved through binding arbitration under the laws of England and Wales.</p>

      <h2>10. Governing Law</h2>
      <p>This Agreement will be governed by the laws of England and Wales.</p>

      <h2>11. Amendments</h2>
      <p>We reserve the right to update or modify these Terms at any time. We will notify you of significant changes by email or by posting the updated Terms on our website.</p>

      <h2>12. Contact Information</h2>
      <div class="contact">
        <p>If you have any questions or concerns regarding these Terms and Conditions, please contact us at:</p>
        <p><strong>info@repruv.co.uk</strong></p>
      </div>

      <script>
        window.onload = function() {
          window.print();
          setTimeout(function() {
            window.close();
          }, 1000);
        }
      </script>
    </body>
    </html>
  `;

  printWindow.document.write(htmlContent);
  printWindow.document.close();
};

export const downloadPrivacyAsPDF = () => {
  // Create a new window with the privacy policy content formatted for printing
  const printWindow = window.open('', '_blank');
  
  if (!printWindow) {
    alert('Please allow popups to download the PDF');
    return;
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Repruv - Privacy Policy</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          max-width: 800px;
          margin: 40px auto;
          padding: 20px;
          color: #333;
        }
        h1 {
          color: #2563eb;
          border-bottom: 2px solid #2563eb;
          padding-bottom: 10px;
        }
        h2 {
          color: #1e40af;
          margin-top: 30px;
          margin-bottom: 15px;
        }
        h3 {
          color: #1e3a8a;
          margin-top: 20px;
        }
        h4 {
          color: #1e3a8a;
          margin-top: 15px;
          margin-bottom: 8px;
        }
        ul {
          margin: 10px 0;
          padding-left: 20px;
        }
        li {
          margin: 8px 0;
        }
        .contact {
          background-color: #f3f4f6;
          padding: 15px;
          border-radius: 5px;
          margin-top: 20px;
        }
        @media print {
          body { margin: 0; }
        }
      </style>
    </head>
    <body>
      <h1>Privacy Policy for Repruv</h1>
      
      <h3>Introduction</h3>
      <p>At Repruv, we are committed to protecting your privacy and ensuring that your experience using our reputation management services is secure, transparent, and positive. This Privacy Policy explains how we collect, use, and protect the personal information of individuals and businesses who use our platform for online reputation management, including review management, AI responses, competitor tracking, social media monitoring, analytics, and team collaboration.</p>
      <p>By accessing or using our platform, you agree to the collection and use of your data in accordance with this policy. Please read this document carefully.</p>
      
      <h2>1. Information We Collect</h2>
      <p>We collect information in the following categories to provide you with comprehensive reputation management services:</p>
      
      <h4>Personal Information</h4>
      <ul>
        <li>Name, email address, phone number, company information (e.g., business name, website URL).</li>
      </ul>

      <h4>Account Information</h4>
      <ul>
        <li>Account credentials (username, password), and account settings (notifications, preferences).</li>
      </ul>

      <h4>Review & Social Media Data</h4>
      <ul>
        <li>Data from third-party platforms such as Google, TrustPilot, Facebook, Instagram, Twitter, etc. This includes reviews, feedback, mentions, comments, and ratings that are collected to centralize and manage your brand's reputation.</li>
      </ul>

      <h4>AI Responses & Interactions</h4>
      <ul>
        <li>Generated AI responses to reviews, feedback, or social media comments for personalizing your brand's voice.</li>
      </ul>

      <h4>Competitor Data</h4>
      <ul>
        <li>Data gathered on your competitors for benchmarking, including their review performance, social media activity, and market position.</li>
      </ul>

      <h4>Analytics & Usage Data</h4>
      <ul>
        <li>Insights and data derived from your review data, including customer sentiment, trends, and performance metrics.</li>
      </ul>

      <h4>Cookies and Tracking Technologies</h4>
      <ul>
        <li>Cookies, web beacons, and other tracking technologies to enhance your user experience on our website and platform.</li>
      </ul>

      <h2>2. How We Use Your Information</h2>
      <p>The information we collect is used to deliver and improve our services:</p>
      <ul>
        <li><strong>Review Management:</strong> To centralize and manage all your online reviews and feedback across multiple platforms in one inbox.</li>
        <li><strong>AI Responses:</strong> To generate and customize responses in your brand voice, saving you time and enhancing customer engagement.</li>
        <li><strong>Competitor Tracking:</strong> To track and analyze competitor performance and benchmarking, allowing you to stay ahead in your industry.</li>
        <li><strong>Social Monitoring:</strong> To monitor social media mentions, comments, and feedback about your brand.</li>
        <li><strong>Analytics & Reports:</strong> To provide actionable insights and reports based on your review and social media data.</li>
        <li><strong>Team Collaboration:</strong> To enable collaboration within your team, including task assignments, role-based permissions, and workflow automation.</li>
      </ul>

      <h2>3. How We Share Your Information</h2>
      <p>We value your privacy and do not sell your personal information to third parties. We may share your information in the following situations:</p>
      <ul>
        <li><strong>Service Providers:</strong> We may share your data with third-party vendors who help us operate our platform and deliver services, such as data storage and analysis.</li>
        <li><strong>Legal Obligations:</strong> We may disclose your data when required by law, court order, or other legal processes.</li>
        <li><strong>Business Transfers:</strong> In the event of a merger, acquisition, or sale of assets, your information may be transferred as part of the business transaction.</li>
      </ul>

      <h2>4. Data Security</h2>
      <p>We employ industry-standard security measures to protect your personal information and the data collected from third-party platforms. However, no system is completely secure, and we cannot guarantee the absolute security of your data.</p>

      <h2>5. Your Data Rights</h2>
      <p>Depending on your location and applicable laws (e.g., GDPR, CCPA), you may have the following rights regarding your data:</p>
      <ul>
        <li><strong>Access:</strong> Request a copy of the personal data we have collected.</li>
        <li><strong>Correction:</strong> Update or correct any inaccurate or incomplete personal data.</li>
        <li><strong>Deletion:</strong> Request that we delete your personal data, subject to applicable legal requirements.</li>
        <li><strong>Opt-Out:</strong> Opt-out of marketing communications or unsubscribe from our email lists.</li>
        <li><strong>Data Portability:</strong> Request a copy of your data in a portable format.</li>
      </ul>
      <p>To exercise these rights, please contact us at info@repruv.co.uk.</p>

      <h2>6. Data Retention</h2>
      <p>We will retain your personal information for as long as your account is active or as needed to provide services, comply with legal obligations, resolve disputes, and enforce our agreements. If you choose to delete your account, we will retain certain information as required by law or for legitimate business purposes.</p>

      <h2>7. International Data Transfers</h2>
      <p>Your information may be stored and processed in countries outside of your country of residence. By using our platform, you consent to the transfer and storage of your information in these jurisdictions.</p>

      <h2>8. Children's Privacy</h2>
      <p>Our platform is not intended for use by individuals under the age of 13. We do not knowingly collect personal information from children. If we become aware of such data, we will take steps to delete it immediately.</p>

      <h2>9. Changes to This Privacy Policy</h2>
      <p>We may update this Privacy Policy from time to time. Any significant changes will be communicated to you via email or by posting the updated policy on our website. Please review the Privacy Policy periodically for any updates.</p>

      <h2>10. Contact Us</h2>
      <div class="contact">
        <p>If you have any questions about this Privacy Policy or how we handle your data, please contact us at:</p>
        <p><strong>info@repruv.co.uk</strong></p>
      </div>

      <script>
        window.onload = function() {
          window.print();
          setTimeout(function() {
            window.close();
          }, 1000);
        }
      </script>
    </body>
    </html>
  `;

  printWindow.document.write(htmlContent);
  printWindow.document.close();
};
