// Copyright (c) 2024, nasiransari97177@gmail.com and contributors
// For license information, please see license.txt

frappe.ui.form.on('Iqama Renewal Tracking', {
    refresh: function(frm) {
        try {
            check_and_update_status(frm);
        } catch (error) {
            log_error(error, 'refresh');
        }
    },
    onload: function(frm) {
        try {
            check_and_update_status(frm);
            update_new_expiry_date(frm);
            calculate_fees(frm);
            calculate_total_amount(frm);
            update_muqeem_balance_after_renewal(frm);
        } catch (error) {
            log_error(error, 'onload');
        }
    },
    before_save: function(frm) {
    try {
        if (frm.doc.renewal_preference == 'Yes' && frm.doc.status == 'Awaiting Operations Approval' && frm.doc.renewal_duration) {
            frm.set_value('status', 'Awaiting Payment');
            show_notification(
                __('Status has been changed to Awaiting Payment')
            );
        } else if (frm.doc.renewal_preference == 'NO' && frm.doc.status == 'Awaiting Operations Approval' && frm.doc.reason_of_not_renew) {
            frm.set_value('status', 'Rejected');
            show_notification(
                __('Status has been changed to Rejected')
            );
        }
    } catch (error) {
        log_error(error, 'before_save');
    }
        
    },

    renewal_duration: function(frm) {
        try {
            update_new_expiry_date(frm);
            calculate_fees(frm);
        } catch (error) {
            log_error(error, 'renewal_duration');
        }
    },
    iqama_expiration_date: function(frm) {
        try {
            update_new_expiry_date(frm);
        } catch (error) {
            log_error(error, 'iqama_expiration_date');
        }
    },
    contract_date: function(frm) {
        try {
            check_and_update_status(frm);
        } catch (error) {
            log_error(error, 'contract_date');
        }
    },
    status: function(frm) {
        try {
            check_and_update_status(frm);
        } catch (error) {
            log_error(error, 'status');
        }
    },
    iqama_renewal_amount: function(frm) {
        try {
            calculate_total_amount(frm);
        } catch (error) {
            log_error(error, 'iqama_renewal_amount');
        }
    },
    work_permit_fee: function(frm) {
        try {
            calculate_total_amount(frm);
        } catch (error) {
            log_error(error, 'work_permit_fee');
        }
    },
    exempt_from_financial_compensation: function(frm) {
        try {
            if (frm.doc.exempt_from_financial_compensation) {
                frm.set_value('renewal_duration', '1 year');
            }
            calculate_fees(frm);
        } catch (error) {
            log_error(error, 'exempt_from_financial_compensation');
        }
    },
    onload_post_render: function(frm) {
        try {
            frm.trigger('check_and_update_status');
        } catch (error) {
            log_error(error, 'onload_post_render');
        }
    },
    muqeem_balance: function(frm) {
        try {
            update_muqeem_balance_after_renewal(frm);
        } catch (error) {
            log_error(error, 'muqeem_balance');
        }
    },
    muqeem_balance_after_renewal: function(frm) {
        try {
            update_muqeem_balance_after_renewal(frm);
        } catch (error) {
            log_error(error, 'muqeem_balance_after_renewal');
        }
    }
});

/**
 * Update the new expiry date based on the iqama expiration date and renewal duration.
 * @param {object} frm - The current form object.
 */
function update_new_expiry_date(frm) {
    if (frm.doc.iqama_expiration_date && frm.doc.renewal_duration) {
        let new_expiry_date = frappe.datetime.add_months(frm.doc.iqama_expiration_date, get_months_from_duration(frm.doc.renewal_duration));
        frm.set_value('iqama_new_expiration_date', new_expiry_date);
    } else {
        show_notification(__('Please set both Iqama Expiration Date and Renewal Duration.'));
    }
}

/**
 * Get the number of months from the renewal duration.
 * @param {string} duration - The renewal duration.
 * @returns {number} - The number of months.
 */
function get_months_from_duration(duration) {
    switch(duration) {
        case '3 months':
            return 3;
        case '6 months':
            return 6;
        case '9 months':
            return 9;
        case '1 year':
       
            return 12;
        default:
            return 0;
    }
}

/**
 * Check and update the status based on the current values in the form.
 * @param {object} frm - The current form object.
 */
function check_and_update_status(frm) {
    if (frm.doc.contract_date && frm.doc.status === 'Waiting for Legal Approval') {
        frm.set_value('status', 'Awaiting Payment');
        show_notification(__('Status has been changed to Awaiting Payment'));
        frm.save_or_update();
    }
    update_muqeem_balance_after_renewal(frm);
}

/**
 * Calculate the total amount by summing the iqama renewal amount and work permit fee.
 * @param {object} frm - The current form object.
 */
function calculate_total_amount(frm) {
    let total = (frm.doc.iqama_renewal_amount || 0) + (frm.doc.work_permit_fee || 0) + (frm.doc.traffic_violation_balance || 0);
    frm.set_value('total_amount', total);
}

/**
 * Calculate the fees based on the renewal type and duration.
 * @param {object} frm - The current form object.
 */
function calculate_fees(frm) {
    let iqama_fee = 0;
    let work_permit_fee = 0;
    let months = get_months_from_duration(frm.doc.renewal_duration);

    if (frm.doc.exempt_from_financial_compensation) {
        if (months !== 12) {
            show_notification('Duration must be 1 year for exempted cases.');
            frm.set_value('renewal_duration', '1 year');
            months = 12;
        }
        work_permit_fee = 100.00;
    } else {
        switch(months) {
            case 3:
                work_permit_fee = 2425.00;
                break;
            case 6:
                work_permit_fee = 4850.00;
                break;
            case 9:
                work_permit_fee = 7275.00;
                break;
            case 12:
                work_permit_fee = 9700.00;
                break;
            default:
                show_notification('Invalid duration selected.');
                console.log("Invalid duration selected: ", months);
                return;
        }
    }

    switch(months) {
        case 3:
            iqama_fee = 163.00;
            break;
        case 6:
            iqama_fee = 325.00;
            break;
        case 9:
            iqama_fee = 488.00;
            break;
        case 12:
            iqama_fee = 650.00;
            break;
        default:
            show_notification('Invalid duration selected.');
            console.log("Invalid duration selected: ", months);
            return;
    }

    frm.set_value('iqama_renewal_amount', iqama_fee);
    frm.set_value('work_permit_fee', work_permit_fee);
    calculate_total_amount(frm);

    let total = (iqama_fee + work_permit_fee + (frm.doc.traffic_violation_balance || 0)).toFixed(2);
    
    console.log("Iqama Renewal Amount: ", iqama_fee);
    console.log("Work Permit Fee: ", work_permit_fee);
    console.log("Total Amount: ", total);

    show_notification(
        `Iqama Renewal Amount: ${iqama_fee.toFixed(2)} <br> Work Permit Fee: ${work_permit_fee.toFixed(2)} <br> Total Amount: ${total}`,
        `  : ${iqama_fee.toFixed(2)} <br>   : ${work_permit_fee.toFixed(2)} <br>  : ${total}`
    );
}

/**
 * Show a notification at the bottom of the page.
 * @param {string} en_message - The message to display in English.
 * @param {string} ar_message - The message to display in Arabic.
 */
function show_notification(en_message, ar_message) {
    let lang = frappe.boot.lang;
    let final_message = lang === 'ar' ? ar_message : en_message;

    console.log("Notification Message: ", final_message);
    frappe.show_alert({message: final_message, indicator: 'green'});
}

/**
 * Update the Muqeem Balance After Renewal field and the Refundable Balance field.
 * @param {object} frm - The current form object.
 */
function update_muqeem_balance_after_renewal(frm) {
    let renewal_amount = frm.doc.iqama_renewal_amount || 0;
    let muqeem_balance = frm.doc.muqeem_balance || 0;

    
    if (frm.doc.status === 'Renewed') {
        frm.set_value('muqeem_balance_after_renewal', muqeem_balance);
    } else {
        frm.set_value('muqeem_balance_after_renewal', muqeem_balance + renewal_amount);
    }

  
    if (frm.doc.muqeem_balance_after_renewal > 0) {
        frm.set_value('refundable_balance', 1);
    } else {
        frm.set_value('refundable_balance', 0);
    }

   
    let balance_after_renewal = frm.doc.muqeem_balance_after_renewal.toFixed(2);
    show_notification(
        __('Muqeem Balance After Renewal: {0}', [balance_after_renewal]),
        '   : {0}'.replace('{0}', balance_after_renewal)
    );
}

/**
 * Log an error with details to help with debugging.
 * @param {object} error - The error object.
 * @param {string} source - The source of the error (function name).
 */
function log_error(error, source) {
    console.error(`Error in ${source}:`, error);
    show_notification(
        __('An error occurred in {0}. Please check the console for more details.', '   {0}.        .').replace('{0}', source),
        'green'
    );
}