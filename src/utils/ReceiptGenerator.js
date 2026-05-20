import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';

// Fee Structure Constants (must match Finance.jsx)
const COURSE_FEE = 90000;
const FEE_BREAKDOWN = [
    { label: 'Registration Fee', amount: 20000 },
    { label: '1st Installment', amount: 25000 },
    { label: '2nd Installment', amount: 45000 },
];

export const generateReceipt = (payment, allStudentPayments = []) => {
    console.log('--- Generating Premium Tabular Receipt ---');

    try {
        const doc = new jsPDF();
        const campusName = payment.students?.campuses?.name || 'Northex';
        const student = payment.students || {};
        const center = 105;

        // Calculate cumulative payment info
        const totalPaidByStudent = allStudentPayments.reduce((sum, p) => sum + Number(p.amount), 0);
        const remainingBalance = Math.max(0, COURSE_FEE - totalPaidByStudent);

        // Determine installment statuses for the detailed table
        let runningPaid = totalPaidByStudent;
        const installmentStatus = FEE_BREAKDOWN.map(fee => {
            if (runningPaid >= fee.amount) {
                runningPaid -= fee.amount;
                return { ...fee, status: 'Paid', paidAmount: fee.amount, remainingAmount: 0 };
            } else if (runningPaid > 0) {
                const partial = runningPaid;
                runningPaid = 0;
                return { ...fee, status: 'Partial', paidAmount: partial, remainingAmount: fee.amount - partial };
            } else {
                return { ...fee, status: 'Unpaid', paidAmount: 0, remainingAmount: fee.amount };
            }
        });

        // --- Design Tokens ---
        const colors = {
            darkGray: [33, 33, 33],
            blueAccent: [0, 106, 255], // Institutional Blue
            greenAccent: [34, 197, 94], // Healthy Green
            textDark: [30, 30, 30],
            border: [230, 230, 230],
            success: [22, 163, 74],
            error: [220, 38, 38],
            muted: [100, 100, 100],
        };

        // ==========================================
        // 1. Premium Branded Header
        // ==========================================

        // --- Blue Block Logo Design ---
        const logoY = 15;
        
        // Main Blue Container
        doc.setFillColor(0, 106, 255); // #006aff Institutional Blue
        doc.rect(center - 30, logoY, 60, 28, 'F');

        // "NORTHEX" in White
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(18);
        doc.setTextColor(255, 255, 255);
        doc.text('NORTHEX', center, logoY + 12, { align: 'center' });

        // White Rectangle for "CAMPUS"
        doc.setFillColor(255, 255, 255);
        doc.rect(center - 26, logoY + 15, 52, 9, 'F');

        // "CAMPUS" in Black
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(18);
        doc.text('CAMPUS', center, logoY + 22, { align: 'center' });

        // Tagline
        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...colors.muted);
        doc.text('Industry-Standard Digital Skills Training • Northex Campus • Mullaitivu', center, logoY + 40, { align: 'center' });

        // Divider Line
        doc.setDrawColor(...colors.border);
        doc.setLineWidth(0.2);
        doc.line(40, logoY + 46, 170, logoY + 46);

        // ==========================================
        // 2. Receipt Title
        // ==========================================
        const titleY = logoY + 56;
        doc.setTextColor(...colors.textDark);
        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.text('PAYMENT RECEIPT', center, titleY, { align: 'center' });
        
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(110, 110, 110);
        doc.text(`REF: ${payment.id.substring(0, 8).toUpperCase()}`, center, titleY + 7, { align: 'center' });

        // ==========================================
        // 3. Identification Details
        // ==========================================
        const detailsY = titleY + 20;
        doc.setFontSize(10.5);
        doc.setTextColor(...colors.textDark);

        // Column 1
        doc.setFont('helvetica', 'bold');
        doc.text('Date:', 20, detailsY);
        doc.setFont('helvetica', 'normal');
        doc.text(format(new Date(payment.created_at), 'MMMM dd, yyyy'), 33, detailsY);

        doc.setFont('helvetica', 'bold');
        doc.text('Student Name:', 20, detailsY + 12);
        doc.setFont('helvetica', 'normal');
        doc.text((student.full_name || 'N/A').toUpperCase(), 48, detailsY + 12);

        // Column 2
        doc.setFont('helvetica', 'bold');
        doc.text('Campus:', 120, detailsY);
        doc.setFont('helvetica', 'normal');
        doc.text(campusName.split(' ')[0], 138, detailsY);

        doc.setFont('helvetica', 'bold');
        doc.text('Payment Method:', 120, detailsY + 12);
        doc.setFont('helvetica', 'normal');
        doc.text(payment.method || 'Cash', 153, detailsY + 12);

        // ==========================================
        // 4. Current Transaction Table
        // ==========================================
        const table1Y = detailsY + 30;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10.5);
        doc.text('Current Transaction', 20, table1Y - 6);

        autoTable(doc, {
            startY: table1Y,
            head: [['Description', 'Amount (LKR)']],
            body: [
                [payment.note || 'Tuition Fees', `Rs. ${Number(payment.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}`]
            ],
            foot: [
                ['Amount Paid', `Rs. ${Number(payment.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}`]
            ],
            theme: 'grid',
            headStyles: { fillColor: [248, 250, 252], textColor: [51, 65, 85], fontStyle: 'bold', halign: 'center' },
            bodyStyles: { halign: 'center', fontSize: 10 },
            footStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'center' },
            columnStyles: { 0: { halign: 'left' } }
        });

        // ==========================================
        // 5. Fee Structure Table
        // ==========================================
        const table2Y = doc.lastAutoTable.finalY + 20;

        const feeRows = installmentStatus.map(inst => {
            const isSettled = inst.remainingAmount === 0;
            return [
                inst.label,
                `Rs. ${inst.amount.toLocaleString()}`,
                `Rs. ${inst.paidAmount.toLocaleString()}`,
                isSettled ? 'Settled' : `Rs. ${inst.remainingAmount.toLocaleString()}`
            ];
        });

        autoTable(doc, {
            startY: table2Y,
            head: [['Fee Component', 'Amount (LKR)', 'Paid (LKR)', 'Remaining (LKR)']],
            body: feeRows,
            foot: [
                [
                    'Total',
                    `Rs. ${COURSE_FEE.toLocaleString()}`,
                    `Rs. ${totalPaidByStudent.toLocaleString()}`,
                    remainingBalance === 0 ? 'Fully Settled' : `Rs. ${remainingBalance.toLocaleString()}`
                ]
            ],
            theme: 'grid',
            headStyles: {
                fillColor: colors.blueAccent,
                textColor: [255, 255, 255],
                halign: 'center',
                fontSize: 10
            },
            bodyStyles: { halign: 'center', fontSize: 9.5 },
            footStyles: { fillColor: [248, 250, 252], fontStyle: 'bold', halign: 'center', fontSize: 10 },
            columnStyles: { 0: { halign: 'left' } },
            didParseCell: (data) => {
                if (data.section === 'body' && data.column.index === 2 && data.cell.raw !== 'Rs. 0') {
                    data.cell.styles.textColor = colors.success;
                    data.cell.styles.fontStyle = 'bold';
                }
                if (data.section === 'body' && data.column.index === 3) {
                    if (data.cell.raw === 'Settled') {
                        data.cell.styles.textColor = colors.success;
                        data.cell.styles.fontStyle = 'bold';
                    } else if (data.cell.raw !== 'Rs. 0') {
                        data.cell.styles.textColor = colors.error;
                        data.cell.styles.fontStyle = 'bold';
                    }
                }
                if (data.section === 'foot') {
                    if (data.column.index === 0 || data.column.index === 1) {
                        data.cell.styles.textColor = colors.blueAccent;
                    }
                    if (data.column.index === 2) data.cell.styles.textColor = colors.success;
                    if (data.column.index === 3) {
                        data.cell.styles.textColor = remainingBalance === 0 ? colors.success : colors.error;
                    }
                }
            }
        });

        // ==========================================
        // 6. Official Validation (Seal & Signature) - Fixed to Bottom
        // ==========================================
        const stampY = 240;

        // Signature Line (Bottom Left)
        doc.setDrawColor(200, 200, 200);
        doc.line(30, stampY + 10, 80, stampY + 10);
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(7);
        doc.setTextColor(...colors.textDark);
        doc.text('R. Vakeesan', 55, stampY + 16, { align: 'center' });
        doc.setFontSize(6.5);
        doc.text('NORTHEX CAMPUS Director', 55, stampY + 21, { align: 'center' });

        // ==========================================
        // 7. Final Message (Very Bottom)
        // ==========================================
        const finalMessageY = 280;
        doc.setFontSize(9);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(80, 80, 80);
        doc.text('Payment received successfully! Thank you for choosing NORTHEX CAMPUS.', center, finalMessageY, { align: 'center' });
        doc.text('We appreciate your continued support and commitment.', center, finalMessageY + 6, { align: 'center' });

        // Generate and Save
        const safeName = (student.full_name || 'Receipt').replace(/\s+/g, '_');
        doc.save(`Official_Tuition_Receipt_${safeName}.pdf`);

    } catch (err) {
        console.error('Receipt Generation Error:', err);
        alert('Could not generate receipt: ' + err.message);
    }
};

export const generateInvoice = (invoiceData) => {
    console.log('--- Generating Premium Tabular Invoice ---');

    try {
        const doc = new jsPDF();
        const center = 105;
        const colors = {
            blueAccent: [0, 106, 255],
            textDark: [30, 30, 30],
            border: [230, 230, 230],
            muted: [100, 100, 100],
            success: [22, 163, 74],
        };

        // ==========================================
        // 1. Premium Branded Header
        // ==========================================
        const logoY = 15;
        doc.setFillColor(0, 106, 255);
        doc.rect(center - 30, logoY, 60, 28, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(18);
        doc.setTextColor(255, 255, 255);
        doc.text('NORTHEX', center, logoY + 12, { align: 'center' });
        doc.setFillColor(255, 255, 255);
        doc.rect(center - 26, logoY + 15, 52, 9, 'F');
        doc.setTextColor(0, 0, 0);
        doc.text('CAMPUS', center, logoY + 22, { align: 'center' });
        
        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...colors.muted);
        doc.text('Industry-Standard Digital Skills Training • Northex Campus • Mullaitivu', center, logoY + 40, { align: 'center' });
        
        doc.setDrawColor(...colors.border);
        doc.setLineWidth(0.2);
        doc.line(40, logoY + 46, 170, logoY + 46);

        // ==========================================
        // 2. Invoice Title & Details
        // ==========================================
        const titleY = logoY + 60;
        doc.setTextColor(...colors.textDark);
        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.text('OFFICIAL INVOICE', center, titleY, { align: 'center' });
        
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(110, 110, 110);
        doc.text(`REF: INV-${invoiceData.id.substring(0, 8).toUpperCase()}`, center, titleY + 7, { align: 'center' });

        // Identification Details (Two Columns)
        const detailsY = titleY + 20;
        doc.setFontSize(10.5);
        doc.setTextColor(...colors.textDark);

        // Column 1
        doc.setFont('helvetica', 'bold');
        doc.text('Date:', 20, detailsY);
        doc.setFont('helvetica', 'normal');
        doc.text(invoiceData.date ? format(new Date(invoiceData.date), 'MMMM dd, yyyy') : format(new Date(), 'MMMM dd, yyyy'), 33, detailsY);

        doc.setFont('helvetica', 'bold');
        doc.text('Student Name:', 20, detailsY + 12);
        doc.setFont('helvetica', 'normal');
        doc.text(invoiceData.studentName.toUpperCase(), 48, detailsY + 12);

        // Column 2
        doc.setFont('helvetica', 'bold');
        doc.text('Contact:', 120, detailsY);
        doc.setFont('helvetica', 'normal');
        doc.text(invoiceData.phone || 'N/A', 138, detailsY);

        doc.setFont('helvetica', 'bold');
        doc.text('Email:', 120, detailsY + 12);
        doc.setFont('helvetica', 'normal');
        doc.text(invoiceData.email || 'N/A', 138, detailsY + 12);

        // ==========================================
        // 3. Line Items Table
        // ==========================================
        const tableY = detailsY + 40;
        const itemRows = invoiceData.items.map(item => [
            item.description,
            `Rs. ${Number(item.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
        ]);

        autoTable(doc, {
            startY: tableY,
            head: [['Description', 'Amount (LKR)']],
            body: itemRows,
            theme: 'grid',
            headStyles: { fillColor: [248, 250, 252], textColor: [51, 65, 85], fontStyle: 'bold', halign: 'center' },
            bodyStyles: { fontSize: 10, halign: 'center' },
            columnStyles: { 0: { halign: 'left' } }
        });

        // ==========================================
        // 4. Totals Calculation
        // ==========================================
        const finalY = doc.lastAutoTable.finalY + 10;
        const subtotal = invoiceData.items.reduce((sum, item) => sum + Number(item.amount), 0);
        const discount = Number(invoiceData.discount || 0);
        const total = subtotal - discount;

        doc.setFontSize(10.5);
        doc.setFont('helvetica', 'normal');
        doc.text('Subtotal:', 140, finalY);
        doc.text(`Rs. ${subtotal.toLocaleString()}`, 190, finalY, { align: 'right' });

        if (discount > 0) {
            doc.text('Discount:', 140, finalY + 8);
            doc.setTextColor(220, 38, 38);
            doc.text(`- Rs. ${discount.toLocaleString()}`, 190, finalY + 8, { align: 'right' });
            doc.setTextColor(...colors.textDark);
        }

        doc.setLineWidth(0.5);
        doc.line(135, finalY + 12, 190, finalY + 12);
        
        doc.setFontSize(13);
        doc.setFont('helvetica', 'bold');
        doc.text('TOTAL DUE:', 140, finalY + 20);
        doc.setTextColor(...colors.blueAccent);
        doc.text(`Rs. ${total.toLocaleString()}`, 190, finalY + 20, { align: 'right' });

        // ==========================================
        // 5. Official Validation (Seal & Signature)
        // ==========================================
        const stampY = 240;
        doc.setDrawColor(200, 200, 200);
        doc.line(30, stampY + 10, 80, stampY + 10);
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(7);
        doc.setTextColor(...colors.textDark);
        doc.text('R. Vakeesan', 55, stampY + 16, { align: 'center' });
        doc.setFontSize(6.5);
        doc.text('NORTHEX CAMPUS Director', 55, stampY + 21, { align: 'center' });

        // ==========================================
        // 6. Notes & Final Message
        // ==========================================
        if (invoiceData.notes) {
            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(...colors.textDark);
            doc.text('Notes:', 20, stampY - 20);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            doc.text(invoiceData.notes, 20, stampY - 14);
        }

        const finalMessageY = 280;
        doc.setFontSize(9);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(80, 80, 80);
        doc.text('This is an official billing document. Thank you for choosing NORTHEX CAMPUS.', center, finalMessageY, { align: 'center' });
        doc.text('We appreciate your continued support and commitment.', center, finalMessageY + 6, { align: 'center' });

        // Save
        const safeName = invoiceData.studentName.replace(/\s+/g, '_');
        doc.save(`Official_Invoice_${safeName}.pdf`);

    } catch (err) {
        console.error('Invoice Generation Error:', err);
        alert('Could not generate invoice: ' + err.message);
    }
};

