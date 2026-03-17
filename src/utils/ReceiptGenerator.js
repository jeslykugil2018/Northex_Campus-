import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';

export const generateReceipt = (payment) => {
    console.log('--- Generating Geometric Payment Receipt ---');

    try {
        const doc = new jsPDF();
        const campusName = payment.students?.campuses?.name || 'NORTHEX CAMPUS';
        const student = payment.students || {};

        // --- Design Tokens (from reference image) ---
        const colors = {
            darkGray: [33, 33, 33],      // #212121
            blueAccent: [83, 114, 240],   // #5372f0 (Matches the blue polygons)
            lightBlueLine: [180, 195, 255], // Soft blue connecting lines
            textDark: [30, 30, 30],       // Nearly black text
            border: [230, 230, 230]       // Light table border
        };

        // ==========================================
        // 1. Geometric Header Graphics
        // ==========================================

        // --- Top Left Corner Shapes ---
        // Black main triangle
        doc.setFillColor(...colors.darkGray);
        doc.triangle(0, 0, 45, 0, 0, 45, 'F');

        // Inner blue triangle right next to it
        doc.setFillColor(...colors.blueAccent);
        doc.triangle(0, 45, 30, 15, 0, 15, 'F');
        // Black secondary polygon below
        doc.setFillColor(...colors.darkGray);
        doc.triangle(0, 45, 30, 45, 0, 75, 'F');

        // Light blue connecting line
        doc.setDrawColor(...colors.lightBlueLine);
        doc.setLineWidth(1.5);
        doc.line(30, 15, 45, 0);

        // --- Top Right Corner Shapes ---
        // Black main triangle
        doc.setFillColor(...colors.darkGray);
        doc.triangle(210, 0, 165, 0, 210, 45, 'F');

        // Inner blue triangle next to it
        doc.setFillColor(...colors.blueAccent);
        doc.triangle(210, 45, 180, 15, 210, 15, 'F');
        // Black secondary polygon below
        doc.setFillColor(...colors.darkGray);
        doc.triangle(210, 45, 180, 45, 210, 75, 'F');

        // Light blue connecting line
        doc.setDrawColor(...colors.lightBlueLine);
        doc.setLineWidth(1.5);
        doc.line(180, 15, 165, 0);

        // ==========================================
        // 2. Institution Logo Box (NORTHEX CAMPUS)
        // ==========================================
        const isNorthex = campusName.toLowerCase().includes('northex');

        // Blue Logo Box
        doc.setFillColor(0, 109, 255); // The specific blue in the logo
        doc.rect(130, 25, 45, 20, 'F');

        // Logo Text (White Box, Blue "NORTHEX", Black "CAMPUS")
        doc.setFillColor(255, 255, 255);
        doc.rect(132, 27, 41, 16, 'F');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(0, 109, 255);
        doc.text(isNorthex ? 'NORTHEX' : 'UPBOLD', 133.5, 35);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        // Slightly tighter letter spacing for CAMPUS
        doc.text(isNorthex ? 'CAMPUS' : 'CAMPUS', 133.5, 42);

        // ==========================================
        // 3. Receipt Title
        // ==========================================
        const titleY = 65;
        doc.setTextColor(...colors.textDark);
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text('Payment Receipt', 105, titleY, { align: 'center' });

        // ==========================================
        // 4. Student Details
        // ==========================================
        const detailsY = 85;
        doc.setFontSize(10);
        doc.setTextColor(...colors.textDark);

        doc.setFont('helvetica', 'bold');
        doc.text('Date: ', 20, detailsY);
        doc.setFont('helvetica', 'normal');
        doc.text(format(new Date(payment.created_at), 'MMMM dd, yyyy'), 32, detailsY);

        doc.setFont('helvetica', 'bold');
        doc.text('Student Name: ', 20, detailsY + 8);
        doc.setFont('helvetica', 'normal');
        doc.text(student.full_name || 'N/A', 47, detailsY + 8);

        // ==========================================
        // 5. Payment Table
        // ==========================================
        const tableStartY = 110;
        const subtotal = Number(payment.amount);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.text('Payment Details', 20, tableStartY - 5);

        autoTable(doc, {
            startY: tableStartY,
            head: [['Description', 'Amount ($)']],
            body: [
                [
                    payment.note || 'Tuition Fee',
                    subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })
                ]
            ],
            foot: [
                ['Total Amount Paid', subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })]
            ],
            theme: 'grid',
            headStyles: {
                fillColor: [248, 248, 248], // Very light gray
                textColor: colors.darkGray,
                fontSize: 9,
                fontStyle: 'bold',
                halign: 'center',
                lineColor: colors.border,
                lineWidth: 0.1,
            },
            bodyStyles: {
                textColor: colors.darkGray,
                fontSize: 9,
                halign: 'center', // Center aligned body text
                lineColor: colors.border,
                lineWidth: 0.1,
            },
            footStyles: {
                fillColor: [255, 255, 255], // White background for footer
                textColor: colors.darkGray,
                fontSize: 9,
                fontStyle: 'bold',
                halign: 'center',
                lineColor: colors.border,
                lineWidth: 0.1,
            },
            columnStyles: {
                0: { halign: 'left', cellWidth: 100 }, // Description left aligned
                1: { halign: 'center' }                 // Amount Center aligned
            }
        });

        // ==========================================
        // 6. Meta Information
        // ==========================================
        const metaY = doc.lastAutoTable.finalY + 15;
        doc.setFontSize(10);
        doc.setTextColor(...colors.textDark);

        doc.setFont('helvetica', 'bold');
        doc.text('Received from: ', 20, metaY);
        doc.setFont('helvetica', 'normal');
        doc.text(campusName, 47, metaY);

        doc.setFont('helvetica', 'bold');
        doc.text('Payment Method: ', 20, metaY + 8);
        doc.setFont('helvetica', 'normal');
        doc.text(payment.method || 'Standard', 52, metaY + 8);

        // ==========================================
        // 7. Footer
        // ==========================================
        const footerY = 220;

        // Very thin separator line
        doc.setDrawColor(...colors.border);
        doc.setLineWidth(0.1);
        doc.line(20, footerY - 5, 190, footerY - 5);

        doc.setTextColor(50, 50, 50); // Muted gray
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');

        const footerText1 = `Thank you for your payment. Should you have any questions or require further details, please do`;
        const footerText2 = `not hesitate to contact us at [].`;

        doc.text(footerText1, 20, footerY + 3);
        doc.text(footerText2, 20, footerY + 8);

        // Page Number
        doc.setTextColor(150, 150, 150); // Light gray
        doc.text('01', 185, 280, { align: 'right' });

        // Generate and Save
        const safeName = (student.full_name || 'Receipt').replace(/\s+/g, '_');
        doc.save(`Payment_Receipt_${safeName}.pdf`);

    } catch (err) {
        console.error('Geometric Receipt Generation Error:', err);
        alert('Could not generate receipt layout: ' + err.message);
    }
};
