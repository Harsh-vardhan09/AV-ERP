// Every route in this module is gated by varifyToken only, except notice
// create/delete which also carry authorize('admin','teacher'). These keys record
// what each router enforces, they do not tighten it.
const ANY_AUTHENTICATED = [];
const NOTICE_AUTHORS = ['admin', 'teacher'];

const permissions = {
  // /notice
  'communication.notices.view': ANY_AUTHENTICATED,
  'communication.notices.list': ANY_AUTHENTICATED,
  'communication.notices.create': NOTICE_AUTHORS,
  'communication.notices.delete': NOTICE_AUTHORS,
  'communication.notices.photo': ANY_AUTHENTICATED,

  // /api/v1/chat
  'communication.chat.createDirect': ANY_AUTHENTICATED,
  'communication.chat.createGroup': ANY_AUTHENTICATED,
  'communication.chat.list': ANY_AUTHENTICATED,
  'communication.chat.addMember': ANY_AUTHENTICATED,
  'communication.chat.removeMember': ANY_AUTHENTICATED,
  'communication.chat.leaveGroup': ANY_AUTHENTICATED,
  'communication.chat.sendMessage': ANY_AUTHENTICATED,
  'communication.chat.getMessage': ANY_AUTHENTICATED,
  'communication.chat.renameGroup': ANY_AUTHENTICATED,
  'communication.chat.allMessages': ANY_AUTHENTICATED,
  'communication.chat.listUnfriends': ANY_AUTHENTICATED,
  'communication.chat.sendFriendRequest': ANY_AUTHENTICATED,
  'communication.chat.acceptFriendRequest': ANY_AUTHENTICATED,

  // /api/v1/knowledgecenter
  'communication.knowledgeCenter.create': ANY_AUTHENTICATED,
  'communication.knowledgeCenter.list': ANY_AUTHENTICATED,

  // bare /api/v1 — complaint box
  'communication.complaints.createSolo': ANY_AUTHENTICATED,
  'communication.complaints.list': ANY_AUTHENTICATED,
  'communication.complaints.createForAll': ANY_AUTHENTICATED,
  'communication.complaints.createForSelected': ANY_AUTHENTICATED,
  'communication.complaints.updateStatus': ANY_AUTHENTICATED,
  'communication.complaints.listRequested': ANY_AUTHENTICATED,
  'communication.complaints.listByMe': ANY_AUTHENTICATED,
  'communication.complaints.addSuggestion': ANY_AUTHENTICATED,
  'communication.complaints.listAccepted': ANY_AUTHENTICATED,
};

module.exports = permissions;
module.exports.ANY_AUTHENTICATED = ANY_AUTHENTICATED;
