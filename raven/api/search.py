import frappe
from pypika import Order, JoinType
import json


@frappe.whitelist()
def get_search_result(doctype, search_text=None, from_user=None, in_channel=None, date=None, file_type=None, channel_type=None, my_channel_only=False, other_channel_only=False, sort_field="creation", sort_order="desc", page_length=10, start_after=0):
    doctype = frappe.qb.DocType(doctype)
    channel_member = frappe.qb.DocType("Raven Channel Member")
    channel = frappe.qb.DocType("Raven Channel")

    query = frappe.qb.from_(doctype).select(
        doctype.name, doctype.file, doctype.owner, doctype.creation, doctype.message_type, doctype.channel_id).where(doctype.message_type != 'Text').join(channel, JoinType.left).on(doctype.channel_id == channel.name).join(channel_member, JoinType.left).on(
            channel_member.channel_id == doctype.channel_id).where((channel.type != 'Private') | (channel_member.user_id == frappe.session.user))

    if search_text:
        query = query.where(doctype.file.like(
            "/private/files/%" + search_text + "%"))

    if from_user and from_user != '[]':
        from_user = json.loads(from_user)
        query = query.where(doctype.owner.isin(from_user))

    if in_channel and in_channel != '[]':
        in_channel = json.loads(in_channel)
        query = query.where(doctype.channel_id.isin(in_channel))

    if date:
        query = query.where(doctype.creation > date)

    if file_type and file_type != '[]':
        file_type = json.loads(file_type)
        query = query.where(doctype.message_type.isin(file_type))

    if channel_type and doctype.doctype == "Raven Channel":
        query = query.where(doctype.type.isin(channel_type))

    if my_channel_only:
        query = query.where((channel.type == 'Open') | (
            channel_member.user_id == frappe.session.user))

    if other_channel_only:
        query = query.where((channel.type == 'Open') | (
            channel_member.user_id != frappe.session.user))

    return query.orderby(doctype[sort_field], order=Order[sort_order]).limit(page_length).offset(start_after).run(as_dict=True)