/*jslint browser: false, node: true, indent: 2 */
"use strict";

/*
 * The purpose of this module is to parse messages (Buffer) and return a formatted object array.
 */

/*  Parses out the first character and the length of each message in the
 *  raw data stream, and returns an array of objects.
 *  type: Type Character
 *  length: original length of the message (includes 4 bytes for length value)
 *  data: Buffer containing remainder of message.
 */
exports.Parse = function (rawBuffer) {
  var objects = {messages: [], partialMessage: null},
    obj,
    ptr,
    length = rawBuffer.length;
  for (ptr = 0; ptr < length; ptr) {
    obj = {};
    // If the remaining buffer is too short to read type & length, then stop processing.
    if (length < ptr + 5) {
      objects.partialMessage = null;
      objects.partialMessage = new Buffer(length - ptr);
      rawBuffer.copy(objects.partialMessage, 0, ptr); // short circuit if we are at the last message of the chunk.
      break;
    }
    obj.type = rawBuffer.toString('ascii', ptr, ptr + 1);
    ptr += 1;
    obj.objLength = rawBuffer.readInt32BE(ptr);
    ptr += 4;

    // If the remaining object is less than the detected length, then stop processing:
    if (length < ptr + obj.objLength - 4) {
      objects.partialMessage = null;
      objects.partialMessage = new Buffer((length - ptr) + 5);
      rawBuffer.copy(objects.partialMessage, 0, ptr - 5); // short circuit if we are at the last message of the chunk.
      break; // short circuit if we are at the last message of the chunk.
    }
    obj.data = new Buffer(obj.objLength - 4);
    rawBuffer.copy(obj.data, 0, ptr, ptr + obj.data.length);
    ptr += obj.data.length;

    objects.messages.push(obj);

  }
  return objects; // array for the connection to loop through
};

// Parses a single message by looking up the function to call from
// the BackendMessageType
exports.parseMessage = function parseMessage(messageObj) {
  messageObj.eventName = BackendMessageType[messageObj.type.toString()].name;
  return BackendMessageType[messageObj.type.toString()](messageObj);
};

// Error message for unimplemented features.
var errRaise = function () {
  throw new Error("Not Implemented");
};

// Private functions to parse every different kind of message:

// Backend Message Format Documentation:
/*
 Data Types for PG:
 Big-Endian data throughout.
 Int<n>(i) - n = bits; i = exact value
 Int<n>[k] - Array of n-bit integers, length k
 String(s) - c-style string (\u0000 terminated); s = exact value
 Byte<n>(c) - n = number of bytes; c = exact value
 */

// AuthenticationOk (B)
// Byte1('R')
// Int32(8)
// Int32(0) - ID
var authenticationOk = function authenticationOk(messageObj) {
  return messageObj;
};

// AuthenticationKerberosV5 (B)
// Byte1('R')
// Int32(8)
// Int32(2) - ID
var authenticationKerberosV5 = function authenticationKerberosV5(messageObj) {
  errRaise();
};

// AuthenticationCleartextPassword (B)
// Byte1('R')
// Int32(8)
// Int32(3) - ID
var authenticationCleartextPassword = function authenticationCleartextPassword(messageObj) {
  return messageObj;
};

// AuthenticationMD5Password (B)
// Byte1('R')
// Int32(12)
// Int32(5) - ID
// Byte4 - The salt to use when encrypting the password
var authenticationMD5Password = function authenticationMD5Password(messageObj) {
  messageObj.salt = new Buffer(4);
  messageObj.salt = messageObj.data.slice(4, 8);
  return messageObj;
};

// AuthenticationGSS (B)
// Byte1('R')
// Int32(8)
// Int32(7) - ID
var authenticationGSS = function authenticationGSS(messageObj) {
  errRaise();
};

// AuthenticationSSPI (B)
// Byte1('R')
// Int32(8)
// Int32(9) - ID
var authenticationSSPI = function authenticationSSPI(messageObj) {
  errRaise();
};

// AuthenticationGSSContinue (B)
// Byte1('R')
// Int32 - Length of message
// Int32(8) - ID
var authenticationGSSContinue = function authenticationGSSContinue(messageObj) {
  errRaise();
};

// BackendKeyData (B)
// Byte1('K')
// Int32(12)
// Int32 - process ID of this backend
// Int32 - secret key of this backend
var backendKeyData = function backendKeyData(messageObj) {
  messageObj.processID = messageObj.data.readInt32BE(0);
  messageObj.secretKey = messageObj.data.readInt32BE(4);
  messageObj.eventName = 'backendKeyData';
  return messageObj;
};

// BindComplete (B)
// Byte1('2')
// Int32(4)
var bindComplete = function bindComplete(messageObj) {
  errRaise();
};

// CloseComplete (B)
// Byte1('3')
// Int32(4)
var closeComplete = function closeComplete(messageObj) {
  errRaise();
};

// CommandComplete (B)
// Byte1('C')
// Int32 - length
// String - command tag.  e.g. "SELECT 99"; <command> <row_count>
var commandComplete = function commandComplete(messageObj) {
  messageObj.commandComplete = true;
  messageObj.commandCompleteResult = messageObj.data.toString('utf8', 0, messageObj.data.length - 1);
  return messageObj;
};
// CopyData (F & B)
// Byte1('d')
// Int32 - Length
// Byte<n> - COPY data stream; each message is a single data row.

// CopyDone (F & B)
// Byte1('c')
// Int32(4)
var copyDone = function copyDone(messageObj) {
  messageObj.copyDone = true;
  return messageObj;
};

// CopyInResponse (B)
// Byte1('G')
// Int32 - Length
// Int8 - format; 0 => textual, 1 => binary (see COPY docs)
// Int16 - number of columns; used as n below
// Int16[n] - format codes for each column.  0 => text; 1 => binary.  All 0 if format is text.
// "Send Copy-in data"
var copyInResponse = function copyInResponse(messageObj) {
  errRaise();
};

// CopyOutResponse (B)
// Byte1('H')
// Int32 - Length
// Int8 - format; 0 => textual, 1 => binary (see COPY docs)
// Int16 - number of columns; used as n below
// Int16[n] - format codes for each column.  0 => text; 1 => binary.  All 0 if format is text.
// "Copy-out data coming"
var copyOutResponse = function copyOutResponse(messageObj) {
  errRaise();
};

// CopyBothResponse (B)
// Byte1('W')
// Int32 - Length
// Int8 - format; 0 => textual, 1 => binary (see COPY docs)
// Int16 - number of columns; used as n below
// Int16[n] - format codes for each column.  0 => text; 1 => binary.  All 0 if format is text.
// "Copy Both" - this is used only for Streaming Replication.
var copyBothResponse = function copyBothResponse(messageObj) {
  errRaise();
};

// DataRow (B)
// Byte1('D')
// Int32 - Length
// Int16 - number of column values that follow
// Following pair of fields for each column:
// Int32 - Length of the following Byte[n]
// Byte[n] - value of the column
// "A Row of data"
// Returns an array of values for this row.  Need rowDescription() to know how these columns
// match up to the rows.
var dataRow = function dataRow(messageObj) {
  var numColumns = messageObj.data.readInt16BE(0),
    i,
    columnValueLength,
    columnValue,
    ptr = 2; // Start after the length data.
  messageObj.rowValue = [];
  for (i = 0; i < numColumns; i += 1) {
    columnValueLength = messageObj.data.readInt32BE(ptr);
    ptr += 4;

    if (columnValueLength >= 0) {
      columnValue = messageObj.data.toString('utf8', ptr, ptr + columnValueLength);
      ptr += columnValueLength;
    } else {
      columnValue = null;
    }
    messageObj.rowValue.push(columnValue);
  }
  messageObj.data = undefined;
  return messageObj;
};

// EmptyQueryReponse (B)
// Byte1('I')
// Int32(4)
// "Responding to empty query string"
var emptyQueryReponse = function emptyQueryReponse(messageObj) {
  errRaise();
};

// ErrorResponse
// Byte1('E')
// Int32 - Length
// Any number of the following pairs:
// Byte1 - Error Code - see below.  Must handle non-existent errors silently.
// String - field value
// Error codes:
// Always Present:
//  S - Severity (ERROR, WARNING, INFO, etc)
//  C - Code (SQLSTATE code for the error) - listed in PG documentation, Appendix A
//  M - Message (human-readable message, TYPICALLY one line)
// Optional messages:
//  D - Detail (multiple lines)
//  H - Hint (might be inappropriate actions suggested; multiple lines)
//  P - Position (Where the error occurred in the original query)
//  p - Internal Position (As P, but refers to an internally generated command, not client-submitted.  when present, q will be present.)
//  q - Internal Query (Text of the failed internal command, if present)
//  W - Where (context or call stack traceback)
//  F - File (file name in source-code where the error was raised)
//  L - Line (line number in source-code)
//  R - Routine (name of the routine in source-code)
// "There was an error with your request"
var errorResponse = function errorResponse(messageObj) {
  var ptr,
    inString,
    beginString,
    currErrType;
  messageObj.errorMessages = {};
  for (beginString = 1, inString = false, ptr = 0; ptr < messageObj.data.length; ptr += 1) {
    if (inString) {
      // Detect end-of-string
      if (messageObj.data[ptr] === 0) { // reached the null byte
        inString = false;
        messageObj.errorMessages[currErrType] = messageObj.data.toString('utf8', beginString, ptr);
        beginString = ptr + 2; // set the next string beginning past the character.
      }
    } else { //not in string
      if (beginString === ptr) { //just started a string
        inString = true;
      } else {
        currErrType = messageObj.data.toString('utf8', ptr, ptr + 1);
        inString = true;
      }
    }
  }
  return messageObj;
};

// FunctionCallResponse (B)
// Byte1('V')
// Int32 - Length
// Int32 - length of the fucntion result value, in bytes.  -1 indicates NULL result; no bytes follow when NULL.
// Byte[n] - value of the function result; n is length above
// "Here is the result of your function call"
var emptyQueryReponse = function emptyQueryReponse(messageObj) {
  errRaise();
};

// NoData (B)
// Byte1('n')
// Int32(4)
// "No data returned"
var noData = function noData(messageObj) {
  messageObj.noData = true;
  return messageObj;
};

// NoticeResponse
// Byte1('N')
// Int32 - Length
// Any number of the following pairs:
// Byte1 - Error Code - see ErrorReponse.  Must handle non-existent errors silently.
// String - field value
var noticeResponse = function noticeResponse(messageObj) {
  var ptr,
    inString,
    beginString,
    currErrType;
  messageObj.noticeMessages = {};
  for (beginString = 1, inString = false, ptr = 0; ptr < messageObj.data.length; ptr += 1) {
    if (inString) {
      // Detect end-of-string
      if (messageObj.data[ptr] === 0) { // reached the null byte
        inString = false;
        messageObj.noticeMessages[currErrType] = messageObj.data.toString('utf8', beginString, ptr);
        beginString = ptr + 2; // set the next string beginning past the character.
      }
    } else { //not in string
      if (beginString === ptr) { //just started a string
        inString = true;
      } else {
        currErrType = messageObj.data.toString('utf8', ptr, ptr + 1);
        inString = true;
      }
    }
  }
  return messageObj;
};

// NotificationResponse (B)
// Byte1('A')
// Int32 - Length
// Int32 - Process ID of backend process
// String - name of the channel
// String - payload passed from the notifying process

// ParameterDescription (B)
// Byte1('t')
// Int32 - Length
// Int16 - number of parameters used by the statement (can be 0)
// Each parameter is:
// Int32 - object ID of the parameter data type

// ParameterStatus (B)
// Byte1('S')
// Int32 - Length
// String - name of the run-time parameter
// String = current value of the parameter
// "Current Setting is ..."
var parameterStatus = function parameterStatus(messageObj) {
  var param_array = messageObj.data.toString().split('\u0000');
  messageObj.parameterKey = param_array[0];
  messageObj.parameterValue = param_array[1];
  return messageObj;
};

// ParseComplete (B)
// Byte1('1')
// Int32(4)
// "response to Parse"

// PortalSuspended (B)
// Byte1('s')
// Int32(4)

// ReadyForQuery (B)
// Byte1('Z')
// Int32(5)
// Byte1 - Backend transaction status indicator.  I = idle; T = in transaction block; E = Failed transaction block
// "Ready for a query, unless status isn't 'I'"
var readyForQuery = function readyForQuery(messageObj) {
  messageObj.transactionStatusIndicator = messageObj.data.toString();
  return messageObj;
};

// RowDescription
// Byte1('T')
// Int32 - Length
// Int16 - number of fields in a row
// For Each Field:
// String - field name
// Int32 - Object ID of the parent table, or 0 if not part of a table
// Int16 - Attribute number of the column, or 0 if not part of a table
// Int32 - Object ID of the data type
// Int16 - data type size; negative = variable-width.  see pg_type.typlen
// Int32 - type modifier; see pg_attribute.atttypmod
// Int16 - format code for the field; 0 = text; 1 = binary.  0 means unknown when responding to a Describe
// Adds rowDescription property to messageObj.  Value is an array of objects.  Each object:
//  fieldName
//  parentTableObjectID
//  attributeNumber
//  dataTypeObjectID
//  dataTypeSize
//  typeModifier
//  formatCode
var rowDescription = function rowDescription(messageObj) {
  var numberOfFields = messageObj.data.readInt16BE(0),
    fieldDescription,
    i,
    curVal,
    strLen = 0,
    ptr = 2; // start after numberOfFields
  messageObj.rowDescription = [];
  for (i = 0; i < numberOfFields; i += 1) {
    fieldDescription = {};
    strLen = 0;
    curVal = messageObj.data[ptr];
    while (curVal !== 0) {
      strLen += 1;
      curVal = messageObj.data[ptr + strLen];
    }
    fieldDescription.fieldName = messageObj.data.toString('utf8', ptr, ptr + strLen);
    ptr += strLen + 1;
    fieldDescription.parentTableObjectID = messageObj.data.readInt32BE(ptr);
    ptr += 4;
    fieldDescription.attributeNumber = messageObj.data.readInt16BE(ptr);
    ptr += 2;
    fieldDescription.dataTypeObjectID = messageObj.data.readInt32BE(ptr);
    ptr += 4;
    fieldDescription.dataTypeSize = messageObj.data.readInt16BE(ptr);
    ptr += 2;
    fieldDescription.typeModifier = messageObj.data.readInt32BE(ptr);
    ptr += 4;
    fieldDescription.formatCode = messageObj.data.readInt16BE(ptr);
    ptr += 2;
    messageObj.rowDescription.push(fieldDescription);
  }
  return messageObj;
};

// Returns a function object that points to the correct function to use.
// Also creates a passwordData property on parser, which can contain
// salt or GSSAPI/SSPI authentication data.
var authenticationMessage = function authenticationMessage(messageObj) {
  var retFunction;
  this.passwordData = {};
  if (messageObj.type === 'R') {
    switch (messageObj.data.readInt32BE(0)) {
    case 0:
      retFunction = authenticationOk;
      break;
    case 2:
      retFunction = errRaise(); //authenticationKerberosV5;
      break;
    case 3:
      retFunction = authenticationCleartextPassword;
      break;
    case 5:
      retFunction = authenticationMD5Password;
      //this.passwordData.salt = messageObj.data.toString('ascii', 8, 12);
      break;
    case 6:
      retFunction = errRaise(); //authenticationSCMCredential;
      break;
    case 7:
      retFunction = errRaise(); //authenticationGSS;
      break;
    case 9:
      retFunction = errRaise(); //authenticationSSPI;
      break;
    case 8:
      retFunction = errRaise(); //authenticationGSSContinue;
      //this.passwordData.authenticationData = messageObj.data.slice(4, messageObj.length - 4);
      break;
    }
  } else {
    throw "authenticationMessage was passed an invalid authentication message!";
  }
  // Override the eventName with the real event:
  messageObj.eventName = retFunction.name;
  return retFunction(messageObj);

};

// Calls a function based on the message type.
var BackendMessageType = {
//  '1': parseComplete,
//  '2': bindComplete,
//  'A': notificationResponse,
    'C': commandComplete,
    'c': copyDone,
    'D': dataRow,
//  'd': copyData,
    'E': errorResponse,
//  'G': copyInResponse,
//  'H': copyOutResponse,
//  'I': emptyQueryResponse,
    'K': backendKeyData,
    'N': noticeResponse,
    'n': noData,
    'R': authenticationMessage, // returns one of a multiple number of messages,
    'S': parameterStatus,
//  's': portalSuspended,
    'T': rowDescription,
//  't': parameterDescription,
//  'V': functionCallResponse,
//  'W': copyBothResponse,
    'Z': readyForQuery
  };