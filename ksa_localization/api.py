import frappe

def create_accrued_entries(doc, method):
    accrued_doctypes = ["Accrued Gosi", "Accrued Ticket", "Accrued Vacation", "Accrued End of Service"]
    
    for doctype in accrued_doctypes:
        pr = frappe.get_doc({
            "doctype": doctype,
            "employee": doc.employee,
            "date": doc.posting_date,
        })
        pr.insert()
        pr.submit()

