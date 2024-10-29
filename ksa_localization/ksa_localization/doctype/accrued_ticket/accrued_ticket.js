// Copyright (c) 2024, nasiransari97177@gmail.com and contributors
// For license information, please see license.txt

frappe.ui.form.on('Accrued Ticket', {
    
    validation: function (frm) {
       
        calculate_accrued_ticket_allowance(frm);
    },
    ticket_period: function (frm) {
        calculate_accrued_ticket_allowance(frm);
    }
});
function calculate_accrued_ticket_allowance(frm) {
    let total_ticket_allowance = frm.doc.total_ticket_allowance;
    let ticket_period = frm.doc.ticket_period;
    if (total_ticket_allowance && ticket_period) {
        let accrued_allowance = total_ticket_allowance / ticket_period/12;
        frm.set_value('monthly_accrued_amount', accrued_allowance);
    } else {
         frm.set_value('monthly_accrued_amount', 0);
        
    }
}
frappe.ui.form.on('Accrued Ticket', {
    on_submit: function(frm) {
        const gl_entries = [
            {
                posting_date: frm.doc.date,               
                account: frm.doc.payable_account,          
                credit: frm.doc.monthly_accrued_amount,               
                credit_in_account_currency: frm.doc.monthly_accrued_amount,
                party_type: 'Employee',
                party: frm.doc.employee,
                voucher_type: 'Accrued Ticket',
                voucher_no: frm.doc.name,
                company: frm.doc.company,
                cost_center: frm.doc.cost_center    
            },
            {
                posting_date: frm.doc.date,
                account: frm.doc.expense_account,           
                debit: frm.doc.monthly_accrued_amount,                    
                debit_in_account_currency: frm.doc.monthly_accrued_amount,
                party_type: 'Employee',
                party: frm.doc.employee,
                company: frm.doc.company,
                voucher_type: 'Accrued Ticket',
                voucher_no: frm.doc.name,
                cost_center: frm.doc.cost_center   
            }
        ];

     
        gl_entries.forEach(gl_entry => {
            frappe.db.insert({
                doctype: 'GL Entry',
                ...gl_entry
            }).then((doc) => {
                frappe.msgprint(__('GL Entry created successfully for Account: {0}', [gl_entry.account]));
            });
        });
        
    }
});
frappe.ui.form.on('Accrued Ticket', {
    refresh: function(frm) {
         if (frm.doc.docstatus === 1) {
        frm.add_custom_button(__('Accounting Ledger'), function() {
         
            frappe.set_route('query-report', 'General Ledger', {
                'voucher_no': frm.doc.name,
                'company': frm.doc.company
            });
        }, __('View'));
    }
    }
});
