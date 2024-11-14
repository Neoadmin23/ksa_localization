# Copyright (c) 2024, nasiransari97177@gmail.com and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from frappe.utils import flt, today

class AccruedGosi(Document):
    def validate(self):
        if not self.employee:
            frappe.throw("Employee is not selected.")
        
        employee = frappe.get_value("Employee", self.employee, ["custom_nationality", "ctc"]) 
        if not employee:
            frappe.throw(f"Employee {self.employee} does not exist.")

        nationality, basic_salary = employee
        if not nationality:
            frappe.throw("Nationality is not set for the employee.")
        
        if basic_salary:
            self.basic = basic_salary
            if nationality == "Saudi":
                self.monthly_accrued_amount = self.basic * 0.1175
            else:
                self.monthly_accrued_amount = self.basic * 0.02
        else:
            frappe.throw("Basic salary is required to calculate the monthly accrued amount")

    def on_submit(self):
        if not self.expense_account:
            frappe.throw("Expense account is not set.")
        if not self.payable_account:
            frappe.throw("Payable account is not set.")
        
        self.create_gl_entry()

    def create_gl_entry(self):
        gosi_expense_account = self.expense_account
        gosi_liability_account = self.payable_account
        amount = flt(self.monthly_accrued_amount) 
        cost_center = self.cost_center or "Main Cost Center" 
        
      
        if not frappe.get_all("Cost Center", filters={"name": cost_center}):
            frappe.throw(f"Cost Center '{cost_center}' does not exist.")
        
        posting_date = self.date or today()

        
        gl_entries = [
            {
                'account': gosi_expense_account,
                'debit': amount,
                'credit': 0,
                'cost_center': cost_center,
                'remarks': 'Accrued GOSI Expense',
            },
            {
                'account': gosi_liability_account,
                'debit': 0,
                'credit': amount,
                'cost_center': cost_center,
                'remarks': 'Accrued GOSI Liability',
            }
        ]

       
        for entry in gl_entries:
            frappe.get_doc({
                'doctype': 'GL Entry',
                'voucher_type': 'Accrued Gosi',
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
            }).insert(ignore_permissions=True)

        frappe.msgprint(f"GL Entries created for Accrued GOSI: {self.name}")

    def on_cancel(self):
        self.cancel_gl_entries()

    def on_trash(self):
        self.delete_gl_entries()

    def cancel_gl_entries(self):
      
        gl_entries = frappe.get_all("GL Entry", filters={
            "voucher_no": self.name,
            "voucher_type": "Accrued Gosi"
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
            "voucher_type": "Accrued Gosi"
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

