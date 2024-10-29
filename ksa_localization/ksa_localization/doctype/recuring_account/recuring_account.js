// Copyright (c) 2024, nasiransari97177@gmail.com and contributors
// For license information, please see license.txt

frappe.ui.form.on('Recuring Account', {
    refresh: function(frm) {
       
        if (frm.doc.recurring_type === 'Number') {
            frm.add_custom_button(__('Split Amount on Number'), function() {
                let total_amount = frm.doc.gross_purchase_amount;
                let periods = frm.doc.total_number_of_recuring;
                let recurring_date = frm.doc.recurring_date; 

                if (!recurring_date) {
                    frappe.msgprint(__('Please set the Recurring Date.'));
                    return;
                }
                if (periods <= 0) {
                    frappe.msgprint(__('Total number of recurrences must be greater than zero.'));
                    return;
                }

                let amount_per_period = total_amount / periods;
                frm.clear_table('schedules');

                for (let i = 0; i < periods; i++) {
                    let repayment_entry = frm.add_child('schedules');
                    if (i === 0) {
                        repayment_entry.schedule_date = recurring_date; 
                    } else {
                        repayment_entry.schedule_date = frappe.datetime.add_months(recurring_date, i); 
                    }
                    repayment_entry.recuring_amount = amount_per_period;
                }

                frm.refresh_field('schedules');
                frappe.msgprint(__('Amount Has Been Split As per Total Number of Recurring.'));
            });
        }
    }
});

frappe.ui.form.on('Recuring Account', {
    purchase_invoice: function(frm) {
        let purchase_invoice = frm.doc.purchase_invoice;

        if (purchase_invoice) {
            frappe.call({
                method: 'frappe.client.get',
                args: {
                    doctype: 'Purchase Invoice',
                    name: purchase_invoice
                },
                callback: function(r) {
                    if (r.message) {
                        let grand_total = r.message.grand_total;
                        let posting_date = r.message.posting_date;

                        frm.set_value('gross_purchase_amount', grand_total);
                        frm.set_value('purchase_date', posting_date);
                    }
                }
            });
        } else {
            frm.set_value('gross_purchase_amount', 0);
            frm.set_value('purchase_date', '');
        }
    }
});

frappe.ui.form.on('Recuring Account', {
    recurring_type: function(frm) {
        if (frm.doc.recurring_type === 'Days') {
            calculate_dates_or_days(frm);
        }
    },
    recurring_date: function(frm) {
        if (frm.doc.recurring_type === 'Days') {
            calculate_dates_or_days(frm);
        }
    },
    recurring_end_date: function(frm) {
        if (frm.doc.recurring_type === 'Days') {
            calculate_dates_or_days(frm);
            set_total_number_of_recuring_days(frm); 
        }
    },
    total_number_of_recuring_days: function(frm) {
        if (frm.doc.recurring_type === 'Days') {
            calculate_dates_or_days(frm);
            set_recurring_end_date(frm);
        }
    },
    refresh: function(frm) {
        if (frm.doc.recurring_type === 'Days') {
            frm.add_custom_button(__('Split Amount on Days'), function() {
                split_into_month(frm);
            });
        }
    }
});

function calculate_dates_or_days(frm) {
    const dateFormat = 'YYYY-MM-DD';
    const startDate = frm.doc.recurring_date;
    const totalDays = frm.doc.total_number_of_recuring_days;
    const endDate = frm.doc.recurring_end_date;

    if (startDate && endDate && !totalDays) {
        const calculatedTotalDays = moment(endDate, dateFormat).diff(moment(startDate, dateFormat), 'days') + 1;
        frm.set_value('total_number_of_recuring_days', calculatedTotalDays);
        frm.refresh_field('total_number_of_recuring_days');
    } 
    else if (startDate && totalDays && !endDate) {
        const calculatedEndDate = moment(startDate, dateFormat).add(totalDays - 1, 'days').format(dateFormat);
        frm.set_value('recurring_end_date', calculatedEndDate);
        frm.refresh_field('recurring_end_date');
    }
}

function set_recurring_end_date(frm) {
    const dateFormat = 'YYYY-MM-DD';
    const startDate = frm.doc.recurring_date;
    const totalDays = frm.doc.total_number_of_recuring_days;

    if (startDate && totalDays) {
        const calculatedEndDate = moment(startDate, dateFormat).add(totalDays - 1, 'days').format(dateFormat);
        frm.set_value('recurring_end_date', calculatedEndDate);
        frm.refresh_field('recurring_end_date');
    }
}

function set_total_number_of_recuring_days(frm) {
    const dateFormat = 'YYYY-MM-DD';
    const startDate = frm.doc.recurring_date;
    const endDate = frm.doc.recurring_end_date;

    if (startDate && endDate) {
        const calculatedTotalDays = moment(endDate, dateFormat).diff(moment(startDate, dateFormat), 'days') + 1;
        frm.set_value('total_number_of_recuring_days', calculatedTotalDays);
        frm.refresh_field('total_number_of_recuring_days');
    }
}

function split_into_month(frm) {
    const startDate = frm.doc.recurring_date;
    const totalNumberOfDays = frm.doc.total_number_of_recuring_days;
    const totalRecurringAmount = frm.doc.gross_purchase_amount;
    const dateFormat = 'YYYY-MM-DD';

    if (!startDate || !totalNumberOfDays || !totalRecurringAmount) {
        frappe.msgprint(__('Please set the Recurring Start Date, Total Number of Recurring Days, and Total Recurring Amount.'));
        return;
    }

    const recurringAmountPerDay = totalRecurringAmount / totalNumberOfDays;
    const start = moment(startDate, dateFormat);
    let remainingDays = totalNumberOfDays;
    const entries = [];
    
    const firstMonthEnd = start.clone().endOf('month');
    const firstRowDays = Math.min(remainingDays, firstMonthEnd.diff(start, 'days') + 1);
    const firstFromDate = start.format(dateFormat);
    const firstToDate = firstMonthEnd.format(dateFormat);
    const firstRowAmount = firstRowDays * recurringAmountPerDay;
    
    entries.push({
        "from_date": firstFromDate,
        "to_date": firstToDate,
        "days_in_month": firstRowDays,
        "recurring_amount": firstRowAmount
    });
    remainingDays -= firstRowDays;
    let i = 1;

    while (remainingDays > 0) {
        const currentMonthStart = start.clone().add(i, 'months').startOf('month');
        const daysInCurrentMonth = currentMonthStart.daysInMonth();
        const daysToUse = Math.min(remainingDays, daysInCurrentMonth);
        const fromDate = currentMonthStart.format(dateFormat);
        const toDate = currentMonthStart.clone().endOf('month').format(dateFormat);
        const rowAmount = daysToUse * recurringAmountPerDay;

        entries.push({
            "from_date": fromDate,
            "to_date": toDate,
            "days_in_month": daysToUse,
            "recurring_amount": rowAmount
        });
        remainingDays -= daysToUse;
        i++;
    }

    frm.clear_table('recurring');
    entries.forEach((entry, index) => {
        const row = frm.add_child('recurring');
        row.from_date = entry.from_date;
        row.to_date = index === entries.length - 1 ? frm.doc.recurring_end_date : entry.to_date;
        row.days = entry.days_in_month;
        row.recuring_amount = entry.recurring_amount.toFixed(2);
    });
    frm.refresh_field('recurring');
    
    frappe.msgprint(__("Amounts are split successfully into {0} recurring entries.", [entries.length]));
}
frappe.ui.form.on('Recuring Account', {
    refresh: function(frm) {
        frm.add_custom_button(__('Make Entry'), function() {
            if (frm.doc.journal_entries_created) {
                frappe.msgprint(__('Journal Entries have already been created for this Recurring Account.'));
                return;
            }
            if (frm.doc.schedules && frm.doc.schedules.length > 0) {
                let all_entries_created = true;
                frm.doc.schedules.forEach(function(schedule_row) {
                    if (schedule_row.recuring_amount === 0 && schedule_row.recuring_amount === 0) {
                        frappe.msgprint(__('Both Debit and Credit values cannot be zero for schedule on {0}', [schedule_row.schedule_date]));
                        all_entries_created = false;
                        return; 
                    }
                    let journal_entry_data = {
                        'doctype': 'Journal Entry',
                        'voucher_type': 'Recuring Entry',
                        
                        'posting_date': schedule_row.schedule_date, 
                        'accounts': [
                            {
                                'account': frm.doc.recuring_expense_account,
                                'debit_in_account_currency': schedule_row.recuring_amount,
                                "reference_type":"Recuring Account",
                                "reference_name":frm.doc.name,
                                'cost_center': schedule_row.cost_center 
                            },
                            {
                                'account': frm.doc.recuring_account, 
                                "reference_type":"Recuring Account",
                                "reference_name":frm.doc.name,
                                'credit_in_account_currency': schedule_row.recuring_amount 
                            }
                        ]
                    };
                    frappe.call({
                        method: 'frappe.client.insert',
                        args: {
                            doc: journal_entry_data
                        },
                        callback: function(response) {
                            if (!response.exc) {
                                frappe.msgprint(__('Journal Entry created successfully for schedule on {0}', [schedule_row.schedule_date]));
                            } else {
                                all_entries_created = false;
                                frappe.msgprint(__('Error while creating Journal Entry for schedule on {0}', [schedule_row.schedule_date]));
                            }
                        }
                    });
                });
                frappe.after_ajax(function() {
                    if (all_entries_created) {
                        frm.set_value('journal_entries_created', 1);
                        frm.save().then(() => {
                            frm.refresh(); 
                            frm.fields_dict['__onload'].grid.get_field('Make Entry').$input.prop('disabled', true); 
                            frappe.msgprint(__('All Journal Entries were created successfully and the button has been disabled.'));
                        });
                    }
                });
            } else {
                
                frappe.msgprint(__('No schedules found to create entries.'));
            }
        });
    }
});