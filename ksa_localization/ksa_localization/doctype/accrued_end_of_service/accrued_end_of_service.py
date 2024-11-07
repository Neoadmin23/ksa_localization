# Copyright (c) 2024, nasiransari97177@gmail.com and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from frappe.utils import flt, today

class AccruedEndofService(Document):
    def validate(self):
        if self.employee:
            employee = frappe.get_value("Employee", self.employee, ["ctc"]) 
            if not employee:
                frappe.throw(f"Employee {self.employee} does not exist.")

            total_end_allowance = employee  

            if not total_end_allowance:
                frappe.throw("End of Service  Allowance is not set for the employee.")
            
            if total_end_allowance:
                self.basic = total_end_allowance
                vacation_period = 12
                self.monthly_accrued_amount = total_end_allowance / vacation_period

            else:
                frappe.throw("End of Service  Allowance is required to calculate the monthly accrued amount")
        else:
            frappe.throw("Employee is not selected.")

    def on_submit(self):
        self.create_gl_entry()

    def create_gl_entry(self):
        end_expense_account = self.expense_account
        end_liability_account = self.payable_account
        amount = flt(self.monthly_accrued_amount) 
        cost_center = self.cost_center if self.cost_center else "Main Cost Center" 

        posting_date = self.posting_date if hasattr(self, 'posting_date') and self.posting_date else today()

        gl_entries = [
            {
                'account': end_expense_account,
                'debit': amount,
                'credit': 0,
                'cost_center': cost_center,
                'remarks': 'Accrued End of Service Expense',
                'voucher_type': 'Accrued End of Service',
                'voucher_no': self.name
            },
            {
                'account': end_liability_account,
                'debit': 0,
                'credit': amount,
                'cost_center': cost_center,
                'remarks': 'Accrued End of Service Liability',
                'voucher_type': 'Accrued End of Service',
                'voucher_no': self.name
            }
        ]

        for entry in gl_entries:
            frappe.get_doc({
                'doctype': 'GL Entry',
                'voucher_type': 'Accrued End of Service',
                'party_type': 'Employee',
                'party': self.employee,
                'voucher_no': self.name,
                'account': entry['account'],
                'debit': entry['debit'],
                'credit': entry['credit'],
                'cost_center': entry['cost_center'],
                'remarks': entry['remarks'],
                'posting_date': posting_date,
                'transaction_date': posting_date,
            }).insert()

        frappe.msgprint(f"GL Entries created for Accrued End of Service: {self.name}")

    def on_cancel(self):
        self.cancel_gl_entries()

    def on_trash(self):
        self.delete_gl_entries()

    def cancel_gl_entries(self):
      
        gl_entries = frappe.get_all("GL Entry", filters={
            "voucher_no": self.name,
            "voucher_type": "Accrued End of Service"
        })

        for entry in gl_entries:
            gl_entry = frappe.get_doc("GL Entry", entry.name)
            
         
            if gl_entry.docstatus == 1: 
                try:
                    gl_entry.cancel()
                    frappe.msgprint(f"GL Entry canceled: {gl_entry.name}")
                except Exception as e:
                    frappe.throw(f"Error canceling GL Entry {gl_entry.name}: {str(e)}")
            else:
                frappe.msgprint(f"GL Entry {gl_entry.name} is already in Draft and cannot be canceled.")

    def delete_gl_entries(self):
      
        gl_entries = frappe.get_all("GL Entry", filters={
            "voucher_no": self.name,
            "voucher_type": "Accrued End of Service"
        })

        for entry in gl_entries:
            gl_entry = frappe.get_doc("GL Entry", entry.name)
            
           
            if gl_entry.docstatus == 1:  
                frappe.throw(f"GL Entry {gl_entry.name} cannot be deleted as it is submitted.")
            else:
                try:
                    frappe.delete_doc("GL Entry", entry.name, force=True)
                    frappe.msgprint(f"GL Entry deleted: {entry.name}")
                except Exception as e:
                    frappe.throw(f"Error deleting GL Entry {entry.name}: {str(e)}")


