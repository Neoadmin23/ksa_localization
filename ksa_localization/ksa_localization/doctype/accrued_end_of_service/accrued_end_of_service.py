# Copyright (c) 2025, nasiransari97177@gmail.com and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from frappe.utils import flt, today


class AccruedEndofService(Document):

    def validate(self):
        if not self.employee:
            frappe.throw("Employee is not selected.")

        total_end_allowance = frappe.get_value("Employee", self.employee, "ctc")
        if not total_end_allowance:
            frappe.throw(f"End of Service Allowance (CTC) is not set for Employee {self.employee}.")

        self.basic = total_end_allowance
        self.monthly_accrued_amount = flt(total_end_allowance) / 12

    def on_submit(self):
        self.create_gl_entry()

    def create_gl_entry(self):
        amount = flt(self.monthly_accrued_amount)
        posting_date = self.date or today()
        cost_center = self.cost_center or "Main - Company"
        company = self.company or frappe.defaults.get_user_default("Company")

        if not self.expense_account or not self.payable_account:
            frappe.throw("Both Expense Account and Payable Account must be set.")

        gl_entries = [
            {
                'account': self.expense_account,
                'debit': amount,
                'debit_in_account_currency': amount,
                'credit': 0,
                'credit_in_account_currency': 0,
                'remarks': 'Accrued End of Service Expense',
            },
            {
                'account': self.payable_account,
                'debit': 0,
                'debit_in_account_currency': 0,
                'credit': amount,
                'credit_in_account_currency': amount,
                'remarks': 'Accrued End of Service Liability',
            }
        ]

        for entry in gl_entries:
            frappe.get_doc({
                'doctype': 'GL Entry',
                'voucher_type': 'Accrued End of Service',
                'voucher_no': self.name,
                'party_type': 'Employee',
                'party': self.employee,
                'account': entry['account'],
                'debit': entry['debit'],
                'credit': entry['credit'],
                'debit_in_account_currency': entry['debit_in_account_currency'],
                'credit_in_account_currency': entry['credit_in_account_currency'],
                'cost_center': cost_center,
                'remarks': entry['remarks'],
                'posting_date': posting_date,
                'transaction_date': posting_date,
                'company': company,
            }).insert()

        frappe.msgprint(f"GL Entries created for Accrued End of Service: {self.name}")

    def on_cancel(self):
        self.cancel_gl_entries()

    def cancel_gl_entries(self):
        gl_entries = frappe.get_all("GL Entry", filters={
            "voucher_type": "Accrued End of Service",
            "voucher_no": self.name
        })

        for entry in gl_entries:
            gl_doc = frappe.get_doc("GL Entry", entry.name)
            if gl_doc.docstatus == 1:
                try:
                    gl_doc.cancel()
                    frappe.msgprint(f"GL Entry canceled: {gl_doc.name}")
                except Exception as e:
                    frappe.throw(f"Error canceling GL Entry {gl_doc.name}: {e}")
            else:
                frappe.msgprint(f"GL Entry {gl_doc.name} is in Draft and cannot be canceled.")

    def on_trash(self):
        self.delete_gl_entries()

    def delete_gl_entries(self):
        gl_entries = frappe.get_all("GL Entry", filters={
            "voucher_type": "Accrued End of Service",
            "voucher_no": self.name
        })

        for entry in gl_entries:
            gl_doc = frappe.get_doc("GL Entry", entry.name)
            if gl_doc.docstatus == 1:
                try:
                    gl_doc.cancel()
                    frappe.msgprint(f"GL Entry canceled before deletion: {gl_doc.name}")
                except Exception as e:
                    frappe.throw(f"Error canceling GL Entry {gl_doc.name}: {e}")
            if gl_doc.docstatus in [0, 2]:
                try:
                    frappe.delete_doc("GL Entry", entry.name, force=True)
                    frappe.msgprint(f"GL Entry deleted: {entry.name}")
                except Exception as e:
                    frappe.throw(f"Error deleting GL Entry {entry.name}: {e}")
