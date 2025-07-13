// Copyright (c) 2025, nasiransari97177@gmail.com and contributors
// For license information, please see license.txt

// frappe.ui.form.on("Accrued End of Service", {
// 	refresh(frm) {

// 	},
// });

// frappe.ui.form.on('Accrued End of Service', {
//     refresh: function(frm) {
//         calculate_monthly_accrued_amount(frm);
//     },
//     basic: function(frm) {
//         calculate_monthly_accrued_amount(frm);
//     },
//     service_durations: function(frm) {
//         calculate_monthly_accrued_amount(frm);
//     }
// });
// function calculate_monthly_accrued_amount(frm) {
//     const basic = frm.doc.basic || 0; 
//     const service_durations = frm.doc.service_durations || 0; 
//     let monthly_accrued_amount;

//     if (service_durations >= 0 && service_durations <= 60) {
//         monthly_accrued_amount = (basic * 0.50) / 12; 
//     } else if (service_durations > 60) {
//         monthly_accrued_amount = (basic * 1) / 12; 
//     } else {
//         monthly_accrued_amount = 0;
//     }

   
//     frm.set_value('monthly_accrued_amount', monthly_accrued_amount);
// }

frappe.ui.form.on('Accrued End of Service', {
    date(frm) {
        if (frm.doc.date_of_joining && frm.doc.date) {
            const joiningDate = new Date(frm.doc.date_of_joining);
            const endDate = new Date(frm.doc.date);
            
            
            let years = endDate.getFullYear() - joiningDate.getFullYear();
            let months = endDate.getMonth() - joiningDate.getMonth();
            let days = endDate.getDate() - joiningDate.getDate();

            
            if (days < 0) {
                months--;
                days += new Date(endDate.getFullYear(), endDate.getMonth(), 0).getDate(); 
            }
            if (months < 0) {
                years--;
                months += 12;
            }
            
           
            const serviceDuration = `${years} Years, ${months} Months, ${days} Days`;
            frm.set_value('service_duration', serviceDuration);
            
           
            const totalMonths = (years * 12) + months;
            frm.set_value('service_durations', totalMonths); 
        }
    }
});

// frappe.ui.form.on('Accrued End of Service', {
//     on_submit: function(frm) {
//         const gl_entries = [
//             {
//                 posting_date: frm.doc.date,               
//                 account: frm.doc.payable_account,          
//                 credit: frm.doc.monthly_accrued_amount,               
//                 credit_in_account_currency: frm.doc.monthly_accrued_amount,
//                 party_type: 'Employee',
//                 party: frm.doc.employee,
//                 voucher_type: 'Accrued End of Service',
//                 voucher_no: frm.doc.name,
//                 company: frm.doc.company,
//                 cost_center: frm.doc.cost_center    
//             },
//             {
//                 posting_date: frm.doc.date,
//                 account: frm.doc.expense_account,           
//                 debit: frm.doc.monthly_accrued_amount,                    
//                 debit_in_account_currency: frm.doc.monthly_accrued_amount,
//                 party_type: 'Employee',
//                 party: frm.doc.employee,
//                 company: frm.doc.company,
//                 voucher_type: 'Accrued End of Service',
//                 voucher_no: frm.doc.name,
//                 cost_center: frm.doc.cost_center   
//             }
//         ];
//         gl_entries.forEach(gl_entry => {
//             frappe.db.insert({
//                 doctype: 'GL Entry',
//                 ...gl_entry
//             }).then((doc) => {
//                 frappe.msgprint(__('GL Entry created successfully for Account: {0}', [gl_entry.account]));
//             });
//         });
        
//     }
// });
frappe.ui.form.on('Accrued End of Service', {
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

