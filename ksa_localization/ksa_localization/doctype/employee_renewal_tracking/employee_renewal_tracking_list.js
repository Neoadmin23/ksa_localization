frappe.listview_settings['Iqama Renewal Tracking'] = {
    add_fields: ["status"],
    get_indicator: function(doc) {
        let status_color = {
            "New": "green",
            "Awaiting Operations Approval": "orange",
            "Waiting for Legal Approval": "blue",
            "Awaiting Payment": "yellow",
            "Awaiting Renewal": "purple",
            "Issue Preventing Renewal": "red",
            "Renewed": "blue",
            "Rejected": "darkgrey",
            "Unknown": "gray",
        };

        let color = status_color[doc.status] || status_color["Unknown"];
        return [__(doc.status), color, "status,=," + doc.status];
    },
    onload: function(listview) {
    add_dashboard(listview);

    listview.page.add_actions_menu_item(__('Copy to Clipboard'), function() {
        let selected_docs = listview.get_checked_items();
        if (selected_docs.length === 0) {
            frappe.msgprint(__('Please select documents to export.'));
            return;
        }
        copy_to_clipboard_as_markdown(selected_docs);
    });

       
        listview.page.add_inner_button(__('Approve Renewal'), function() {
    let selected_docs = listview.get_checked_items();
    if (selected_docs.length === 0) {
        frappe.msgprint(__('Please select documents to approve renewal.'));
        return;
    }

    
    let invalid_docs = selected_docs.filter(doc => doc.status !== 'New');
    let valid_docs = selected_docs.filter(doc => doc.status === 'New');

    
    if (invalid_docs.length > 0) {
        frappe.msgprint(__('Please select only documents with status New.'));
        return;
    }

    (async function update_status(docs, new_status) {
        for (const doc of docs) {
            try {
                await frappe.db.set_value('Iqama Renewal Tracking', doc.name, 'status', new_status);
            } catch (error) {
                console.error("Error updating status for doc:", doc.name, error);
                frappe.msgprint(__('Error updating status for: ') + doc.name);
            }
        }
        frappe.msgprint(__('Status updated to: ') + new_status);
        listview.refresh();
    })(valid_docs, 'Awaiting Operations Approval');
}, __("Tools"));
      
        listview.page.add_inner_button(__('Reject Renewal'), function() {
            let selected_docs = listview.get_checked_items();
            if (selected_docs.length === 0) {
                frappe.msgprint(__('Please select documents to reject renewal.'));
                return;
            }

            (async function update_status(docs, new_status) {
                for (const doc of docs) {
                    try {
                        await frappe.db.set_value('Iqama Renewal Tracking', doc.name, 'status', new_status);
                    } catch (error) {
                        console.error("Error updating status for doc:", doc.name, error);
                        frappe.msgprint(__('Error updating status for: ') + doc.name);
                    }
                }
                frappe.msgprint(__('Status updated to: ') + new_status);
                listview.refresh();
            })(selected_docs, 'Rejected');
        }, __("Tools"));
       
        listview.page.add_inner_button(__('Update Renewal Preference'), function() {
    let selected_docs = listview.get_checked_items();
    if (selected_docs.length === 0) {
        frappe.msgprint(__('Please select documents to update Renewal Preference.'));
        return;
    }

  
    let invalid_docs = selected_docs.filter(doc => doc.status !== 'Awaiting Operations Approval');
    let valid_docs = selected_docs.filter(doc => doc.status === 'Awaiting Operations Approval');

    
    if (invalid_docs.length > 0) {
        frappe.msgprint(__('Please select only documents with status Awaiting Operations Approval.'));
        return;
    }

    frappe.prompt(
        [
            {
                'fieldname': 'renewal_preference',
                'fieldtype': 'Select',
                'label': __('Renewal Preference'),
                'options': [
                    {'label': __('Yes'), 'value': 'Yes'},
                    {'label': __('No'), 'value': 'No'}
                ],
                'reqd': 1
            },
            {
                'fieldname': 'renewal_duration',
                'fieldtype': 'Select',
                'label': __('Renewal Duration'),
                'options': [
                    {'label': __('3 months'), 'value': '3 months'},
                    {'label': __('6 months'), 'value': '6 months'},
                    {'label': __('9 months'), 'value': '9 months'},
                    {'label': __('1 year'), 'value': '1 year'}
                ],
                'depends_on': 'eval:doc.renewal_preference == "Yes"',
                'reqd': 0  
            },
            {
                'fieldname': 'reason_of_not_renew',
                'fieldtype': 'Small Text',
                'label': __('Reason of Not Renewal'),
                'depends_on': 'eval:doc.renewal_preference == "No"',
                'reqd': 0      
            }
        ],
        async function(values) {
            if (values.renewal_preference === 'Yes' && !values.renewal_duration) {
                frappe.msgprint(__('Renewal Duration is required when Renewal Preference is Yes.'));
                return;
            }
            if (values.renewal_preference === 'No' && !values.reason_of_not_renew) {
                frappe.msgprint(__('Reason of Not Renewal is required when Renewal Preference is No.'));
                return;
            }

            for (const doc of valid_docs) {
                try {
                    let frm = await frappe.db.get_doc('Iqama Renewal Tracking', doc.name);

                    // Update renewal preference and related fields
                    await frappe.db.set_value('Iqama Renewal Tracking', doc.name, 'renewal_preference', values.renewal_preference);
                    if (values.renewal_preference === 'Yes') {
                        await frappe.db.set_value('Iqama Renewal Tracking', doc.name, 'renewal_duration', values.renewal_duration);
                        await frappe.db.set_value('Iqama Renewal Tracking', doc.name, 'status', 'Awaiting Payment');
                    } else {
                        await frappe.db.set_value('Iqama Renewal Tracking', doc.name, 'reason_of_not_renew', values.reason_of_not_renew);
                        await frappe.db.set_value('Iqama Renewal Tracking', doc.name, 'status', 'Rejected');
                    }
              
                    let iqama_fee = 0;
                    let work_permit_fee = 0;
                    let months = 0;
                    if (values.renewal_preference === 'Yes') {
                        switch (values.renewal_duration) {
                            case '3 months':
                                months = 3;
                                break;
                            case '6 months':
                                months = 6;
                                break;
                            case '9 months':
                                months = 9;
                                break;
                            case '1 year':
                                months = 12;
                                break;
                            default:
                                months = 0;
                        }

                        switch (months) {
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
                                continue;
                        }

                        switch (months) {
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
                                continue;
                        }

                        await frappe.db.set_value('Iqama Renewal Tracking', doc.name, 'iqama_renewal_amount', iqama_fee);
                        await frappe.db.set_value('Iqama Renewal Tracking', doc.name, 'work_permit_fee', work_permit_fee);

                        let total = iqama_fee + work_permit_fee + (frm.traffic_violation_balance || 0);
                        await frappe.db.set_value('Iqama Renewal Tracking', doc.name, 'total_amount', total.toFixed(2));

                       
                        let renewal_amount = iqama_fee;
                        let muqeem_balance = frm.muqeem_balance || 0;

                        if (frm.status === 'Renewed') {
                            await frappe.db.set_value('Iqama Renewal Tracking', doc.name, 'muqeem_balance_after_renewal', muqeem_balance);
                        } else {
                            await frappe.db.set_value('Iqama Renewal Tracking', doc.name, 'muqeem_balance_after_renewal', muqeem_balance + renewal_amount);
                        }

                        let muqeem_balance_after_renewal = muqeem_balance + renewal_amount;
                        await frappe.db.set_value('Iqama Renewal Tracking', doc.name, 'refundable_balance', muqeem_balance_after_renewal > 0 ? 1 : 0);
                    }

                } catch (error) {
                    console.error("Error updating Renewal Preference for doc:", doc.name, error);
                    frappe.msgprint(__('Error updating Renewal Preference for: ') + doc.name);
                }
            }
            frappe.msgprint(__('Renewal Preference updated successfully.'));
            listview.refresh();
        },
        __('Enter Renewal Preference'),
        __('Update')
    );
}, __("Tools"));

        // Update SADAD Number and Exemption Status button
        listview.page.add_inner_button(__('Update SADAD Number'), function() {
    let selected_docs = listview.get_checked_items();
    if (selected_docs.length === 0) {
        frappe.msgprint(__('Please select documents to update SADAD number or exemption status.'));
        return;
    }

    frappe.prompt(
        [
            {
                'fieldname': 'sadad_number',
                'fieldtype': 'Data',
                'label': __('SADAD Number'),
                'reqd': 1
            },
            {
                'fieldname': 'exempt_from_financial_compensation',
                'fieldtype': 'Check',
                'label': __('Exempt from Financial Compensation')
            }
        ],
        function(values) {
            (async function update_sadad_and_exemption(docs, sadad_number, exempt_from_financial_compensation) {
                for (const doc of docs) {
                    try {
                     
                        let iqama_doc = await frappe.db.get_doc('Iqama Renewal Tracking', doc.name);
                        
                      
                        await frappe.db.set_value('Iqama Renewal Tracking', doc.name, 'sadad_invoice', sadad_number);
                         
                        let new_status = exempt_from_financial_compensation ? 1 : 0;
                        await frappe.db.set_value('Iqama Renewal Tracking', doc.name, 'exempt_from_financial_compensation', new_status);

                       
                        if (new_status) {
                            if (iqama_doc.renewal_duration !== '1 year') {
                                frappe.msgprint(__('Duration must be 1 year for exempted cases.'));
                                await frappe.db.set_value('Iqama Renewal Tracking', doc.name, 'renewal_duration', '1 year');
                            }
                            await frappe.db.set_value('Iqama Renewal Tracking', doc.name, 'work_permit_fee', 100.00);
                        }

                    } catch (error) {
                        console.error("Error updating SADAD number or exemption status for doc:", doc.name, error);
                        frappe.msgprint(__('Error updating SADAD number or exemption status for: ') + doc.name);
                    }
                }
                frappe.msgprint(__('SADAD number and exemption status updated successfully.'));
                listview.refresh();
            })(selected_docs, values.sadad_number, values.exempt_from_financial_compensation);
        },
        __('Enter SADAD Number & Exemption Status'),
        __('Update')
    );
}, __("Tools"));
       
        listview.page.add_inner_button(__('Create Payment Request'), function() {
    let selected_docs = listview.get_checked_items();
    if (selected_docs.length === 0) {
        frappe.msgprint(__('Please select documents to create payment request.'));
        return;
    }

    
    let excluded_docs = selected_docs.filter(doc => doc.iqama_renewal_issue == 1);
    let valid_docs = selected_docs.filter(doc => doc.iqama_renewal_issue != 1);

    
    if (excluded_docs.length > 0) {
        excluded_docs.forEach(doc => {
            frappe.msgprint(__('Employee {0} excluded due to renewal issue.', [doc.employee_name]));
        });
    }

   
    valid_docs = valid_docs.filter(doc => doc.status === 'Awaiting Payment');
    if (valid_docs.length === 0) {
        frappe.msgprint(__('Please select documents with status Awaiting Payment.'));
        return;
    }

    frappe.prompt(
        [
            {
                'fieldname': 'payment_type',
                'fieldtype': 'Select',
                'label': __('Payment Type'),
                'options': [
                    {'label': __('PR Created for Work Cards'), 'value': 'PR Created for Work Cards'},
                    {'label': __('PR Created for Iqama Renewal'), 'value': 'PR Created for Iqama Renewal'}
                ],
                'reqd': 1
            }
        ],
        function(values) {
            (async function create_bulk_payment_request(docs, payment_type) {
                const lang = frappe.boot.user.language;
                const messages = {
                    pr_created: {
                        en: 'Payment Request Created',
                       
                    },
                    error_message: {
                        en: 'Error creating Payment Request for: ',
                       
                    }
                };

                let errorList = [];
                let successList = [];
                let remarks = '';
                let total_amount = 0;

               
                docs = docs.filter(doc => {
                    if ((payment_type === 'PR Created for Work Cards' && (doc.pr_status === 'PR Created for Work Cards' || doc.pr_status === 'PR Created for Both Work Cards and Iqama Renewal')) ||
                        (payment_type === 'PR Created for Iqama Renewal' && (doc.pr_status === 'PR Created for Iqama Renewal' || doc.pr_status === 'PR Created for Both Work Cards and Iqama Renewal'))) {
                        frappe.msgprint(__('Payment Request already created for document {0} for employee {1}.', [doc.name, doc.employee_name]));
                        return false;
                    }
                    return true;
                });

              
                for (const doc of docs) {
                    try {
                        let frm = await frappe.db.get_doc('Iqama Renewal Tracking', doc.name);

                       
                        if (payment_type === 'PR Created for Work Cards' && !frm.sadad_invoice) {
                            frappe.msgprint(__('Document {0} for employee {1} has no SADAD number. Please try again after adding the SADAD number.', [frm.name, frm.employee_name]));
                            continue;
                        }

                       
                        if (frm.employee) remarks += `Employee: ${frm.employee}\n`;
                        if (frm.employee_name) remarks += `Employee Name: ${frm.employee_name}\n`;
                        if (frm.iqama_expiration_date) remarks += `Iqama Expiration Date: ${frm.iqama_expiration_date}\n`;
                        if (frm.iqama_new_expiration_date) remarks += `New Iqama Expiration Date: ${frm.iqama_new_expiration_date}\n`;
                        if (frm.renewal_duration) remarks += `Renewal Duration: ${frm.renewal_duration}\n`;
                        if (frm.cost_center) remarks += `Cost Center: ${frm.cost_center}\n`;
                        if (frm.department) remarks += `Department: ${frm.department}\n`;
                        if (frm.corporation) remarks += `Corporation: ${frm.corporation}\n`;

                       
                        if (payment_type === 'PR Created for Work Cards') {
                            if (frm.sadad_invoice) remarks += `SADAD Invoice: ${frm.sadad_invoice}\n`;
                            if (frm.work_permit_fee) {
                                remarks += `Work Permit Fee: ${frm.work_permit_fee}\n`;
                                total_amount += parseFloat(frm.work_permit_fee);
                            }
                        } else if (payment_type === 'PR Created for Iqama Renewal') {
                            if (frm.iqama_renewal_amount) {
                                remarks += `Iqama Renewal Amount: ${frm.iqama_renewal_amount}\n`;
                                total_amount += parseFloat(frm.iqama_renewal_amount);
                            }
                        }

                        remarks += '------------------------\n';
                        successList.push(frm.name);

                    } catch (error) {
                        errorList.push(doc.name);
                        frappe.msgprint(messages.error_message[lang] + doc.name);
                    }
                }

                if (successList.length > 0) {
                    // Create a new Expense Request
                    const paymentRequest = frappe.model.get_new_doc('Expense Request Afmco');
                    paymentRequest.beneficiary_name = payment_type === 'PR Created for Work Cards' ? '   ( )' : '   ';
                    paymentRequest.amount = total_amount;  // Total amount calculated from all documents
                    paymentRequest.project =  'Head Office - AF';
                    paymentRequest.cost_center = 'Head Office - AF';
                    paymentRequest.jv_status = 'JV Not Created';
                    paymentRequest.naming_series = 'PR-.YYYY.-';
                    paymentRequest.date = frappe.datetime.nowdate();
                    paymentRequest.bank_payment_date = frappe.datetime.nowdate();
                    paymentRequest.payment_type = 'SADAD Payment';
                    paymentRequest.mode_of_payment = 'SADAD Payment';
                    paymentRequest.remark = remarks;
                    paymentRequest.account_no = 'SADAD numbers attached';

                    try {
                       
                        frappe.set_route('Form', paymentRequest.doctype, paymentRequest.name);
                        await frappe.model.set_value(paymentRequest.doctype, paymentRequest.name, 'account_no', paymentRequest.account_no);
                        await frappe.model.set_value(paymentRequest.doctype, paymentRequest.name, 'remark', paymentRequest.remark);
                        frappe.msgprint(messages.pr_created[lang]);

                       
                        for (const name of successList) {
                            let frm = await frappe.db.get_doc('Iqama Renewal Tracking', name);
                            let new_pr_status = '';
                            if (payment_type === 'PR Created for Work Cards') {
                                if (frm.pr_status === 'PR Created for Iqama Renewal') {
                                    new_pr_status = 'PR Created for Both Work Cards and Iqama Renewal';
                                } else {
                                    new_pr_status = 'PR Created for Work Cards';
                                }
                            } else if (payment_type === 'PR Created for Iqama Renewal') {
                                if (frm.pr_status === 'PR Created for Work Cards') {
                                    new_pr_status = 'PR Created for Both Work Cards and Iqama Renewal';
                                } else {
                                    new_pr_status = 'PR Created for Iqama Renewal';
                                }
                            }
                            await frappe.db.set_value('Iqama Renewal Tracking', name, 'pr_status', new_pr_status);
                            await frappe.db.set_value('Iqama Renewal Tracking', name, 'status', 'Awaiting Payment');
                        }
                    } catch (error) {
                        console.error("Error opening payment request form:", error);
                        frappe.msgprint(messages.error_message[lang] + successList.join(', '));
                    }
                }

                if (errorList.length > 0) {
                    frappe.msgprint(__('Errors encountered for documents: ') + errorList.join(', '));
                }
            })(valid_docs, values.payment_type);
        },
        __('Select Payment Type'),
        __('Create')
    );
}, __("Tools"));
       
        listview.page.add_inner_button(__('Confirm Payment'), function() {
    let selected_docs = listview.get_checked_items();
    if (selected_docs.length === 0) {
        frappe.msgprint(__('Please select documents to confirm payment.'));
        return;
    }

    // Filter out documents that do not have status Awaiting Payment
    let valid_docs = selected_docs.filter(doc => doc.status === 'Awaiting Payment');
    if (valid_docs.length === 0) {
        frappe.msgprint(__('Please select documents with status Awaiting Payment.'));
        return;
    }

   
    (async function update_status(docs) {
        const new_status = 'Awaiting Renewal';  // Define the new status here
        for (const doc of docs) {
            try {
                await frappe.db.set_value('Iqama Renewal Tracking', doc.name, 'status', new_status);
            } catch (error) {
                console.error("Error updating status for doc:", doc.name, error);
                frappe.msgprint(__('Error updating status for: ') + doc.name);
            }
        }
        frappe.msgprint(__('Status updated to: ') + new_status);
        listview.refresh();
    })(valid_docs);
}, __("Tools"));

    }
};

function add_dashboard(listview) {
    
    var css = `
        .dashboard-stat {
            display: inline-block;
            width: 200px;
            margin: 10px;
            padding: 15px;
            background-color: var(--card-bg-color, #f5f7fa);
            border-radius: 5px;
            text-align: center;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        .stat-title {
            font-size: 14px;
            margin-bottom: 5px;
        }
        .stat-value {
            font-size: 18px;
            font-weight: bold;
        }
        .dashboard-container {
            margin-bottom: 20px;
        }
        .dashboard-stat.green .stat-title { color: var(--success-color, #28a745); }
        .dashboard-stat.blue .stat-title { color: var(--primary-color, #007bff); }
        .dashboard-stat.orange .stat-title { color: var(--warning-color, #fd7e14); }
        .dashboard-stat.yellow .stat-title { color: var(--yellow-color, #ffc107); }
        .dashboard-stat.red .stat-title { color: var(--danger-color, #dc3545); }
        .dashboard-stat.purple .stat-title { color: var(--purple-color, #6f42c1); }
    `;
    $("<style>").html(css).appendTo("head");

  
    let dashboard_container = $(`
        <div class="dashboard-container"></div>
    `).prependTo(listview.page.wrapper.find('.layout-main-section'));

  
    add_dashboard_stat(dashboard_container, 'Expired Iqamas', 'expired_iqama', 'expired_iqama', 'red');
    add_dashboard_stat(dashboard_container, 'Expiration this week', 'iqama_expiration_date', 'this week', 'orange');
    add_dashboard_stat(dashboard_container, 'Expiration next week', 'iqama_expiration_date', 'next week', 'yellow');
    add_dashboard_stat(dashboard_container, 'Expiration tomorrow', 'iqama_expiration_date', frappe.datetime.add_days(frappe.datetime.get_today(), 1), 'red');
    add_dashboard_stat(dashboard_container, 'Awaiting Operations Approval', 'status', 'Awaiting Operations Approval', 'blue');
}

function add_dashboard_stat(container, title, field, value, color_class) {
    let filters = [];

    if (field === 'iqama_expiration_date') {
        if (value === 'this week') {
            filters = [
                [field, "between", [frappe.datetime.get_today(), frappe.datetime.add_days(frappe.datetime.get_today(), 7)]],
                ["status", "!=", "Renewed"],
                ["status", "!=", "Rejected"]
            ];
        } else if (value === 'next week') {
            filters = [
                [field, "between", [frappe.datetime.add_days(frappe.datetime.get_today(), 7), frappe.datetime.add_days(frappe.datetime.get_today(), 14)]],
                ["status", "!=", "Renewed"],
                ["status", "!=", "Rejected"]
            ];
            
        } else if (field === 'iqama_expiration_date' && value === frappe.datetime.add_days(frappe.datetime.get_today(), 1)) {
            filters = [
                [field, "=", frappe.datetime.add_days(frappe.datetime.get_today(), 1)],
                ["status", "!=", "Renewed"],
                ["status", "!=", "Rejected"]
            ];
            
        }
        
    } else if (value === 'expired_iqama') {
        filters = [
            ["iqama_expiration_date", "<=", frappe.datetime.get_today()],
            ["corporation", "is", "set"],
            ["iqama_expiration_date", "is", "set"],
            ["status", "=", "Active"]
        ];

        frappe.call({
            method: 'frappe.client.get_list',
            args: {
                doctype: 'Employee',
                fields: ["name"],
                filters: filters,
            limit_page_length: 10000  
            },
            callback: function(r) {
                if (r.message) {
                    let count = r.message.length;
                    let dashboard_stat = `
                        <div class="dashboard-stat ${color_class}">
                            <div class="stat-title">${__(title)}</div>
                            <div class="stat-value">${count}</div>
                        </div>
                    `;
                    container.append(dashboard_stat);
                }
            }
        });
        return;
    } else {
        filters = [[field, "=", value], ["status", "!=", "Renewed"]];
    }

    frappe.call({
        method: 'frappe.client.get_list',
        args: {
            doctype: "Iqama Renewal Tracking",
            fields: ["name"],
            filters: filters,
            limit_page_length: 0
        },
        callback: function(r) {
            if (r.message) {
                let count = r.message.length;
                let dashboard_stat = `
                    <div class="dashboard-stat ${color_class}">
                        <div class="stat-title">${__(title)}</div>
                        <div class="stat-value">${count}</div>
                    </div>
                `;
                container.append(dashboard_stat);
            }
        }
    });
}

function copy_to_clipboard_as_markdown(docs) {
  
    let html_data = `<table border="1" style="border-collapse: collapse; width: 100%;">`;
    html_data += `<thead>
                    <tr>
                        <th>Employee Name</th>
                        <th>Employee</th>
                        <th>Department</th>
                        <th>Cost Center</th>
                        <th>Iqama Expiration Date</th>
                        <th>Corporation</th>
                    </tr>
                  </thead>`;
    html_data += `<tbody>`;

   
    docs.forEach(doc => {
        html_data += `<tr>
                        <td>${doc.employee_name || ''}</td>
                        <td>${doc.employee || ''}</td>
                        <td>${doc.department || ''}</td>
                        <td>${doc.cost_center || ''}</td>
                        <td>${doc.iqama_expiration_date || ''}</td>
                        <td>${doc.corporation || ''}</td>
                      </tr>`;
    });

    html_data += `</tbody></table>`;

 
    let tempElement = document.createElement('div');
    tempElement.innerHTML = html_data;
    document.body.appendChild(tempElement);

    // Copy the HTML to the clipboard
    let range = document.createRange();
    range.selectNode(tempElement);
    window.getSelection().removeAllRanges();  
    window.getSelection().addRange(range);    

    try {
        // Copy the selection to clipboard
        let successful = document.execCommand('copy');
        if (successful) {
            frappe.msgprint(__('Data copied to clipboard.'));
        } else {
            frappe.msgprint(__('Failed to copy data to clipboard.'));
        }
    } catch (err) {
        console.error('Could not copy text: ', err);
        frappe.msgprint(__('Failed to copy data to clipboard.'));
    }

    // Cleanup
    document.body.removeChild(tempElement);
    window.getSelection().removeAllRanges(); // Deselect the text
}

