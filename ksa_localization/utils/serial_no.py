import frappe
from frappe.utils import cint

def get_delivery_note_serial_no(item_code, qty, delivery_note):
    """Fetch serial numbers from Delivery Note Item table for a given item and Delivery Note."""
    if not delivery_note:
        return ""

    serial_nos = frappe.db.sql_list(
        """
        SELECT serial_no FROM `tabDelivery Note Item`
        WHERE parent = %(delivery_note)s
          AND item_code = %(item_code)s
          AND serial_no IS NOT NULL
        """,
        {
            "delivery_note": delivery_note,
            "item_code": item_code,
        }
    )

    # serial_nos is a list of strings like ['SN001\nSN002', 'SN003'] — so we split and flatten
    flattened_serials = []
    for sn in serial_nos:
        flattened_serials.extend(sn.split("\n"))

    return "\n".join(flattened_serials[:cint(qty)])
