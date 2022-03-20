import TelegramBot from "node-telegram-bot-api";
import { telegramKey, importFolder } from "../settings.js";
import fetch from "node-fetch";
import arrayBufferToBuffer from "arraybuffer-to-buffer";
import { fs } from "file-system";
import { API } from '../alfresco/alfrescoApi.js'

import path from "path";
import { fileTypeFromFile, fileTypeFromBuffer } from "file-type";

export const bot = new TelegramBot(telegramKey, { polling: true });
export const keyboardBuilder = function (buttons) {
  // array of arrays or objects
  let keyboard = {
    reply_markup: {
      inline_keyboard: [],
    },
    parse_mode: "Markdown",
  };
  let key_buttons = keyboard.reply_markup.inline_keyboard;
  buttons.forEach((el) => {
    if (Array.isArray(el)) {
      key_buttons.push(el);
    } else {
      if (key_buttons.length > 0) {
        key_buttons[key_buttons.length - 1].push(el);
      } else {
        key_buttons.push([el]);
      }
    }
  });
  return keyboard;
};

export const sendGreetings = function (chatId) {
  const logo = "../src/image/TG_123_5416.jpg";
  const mes_greetings =
    "Реєстрація документів учасника ДФТГ";
  const buttons = [];
  buttons.push([{ text: 'Завантажити документи', callback_data: "define ipn" }]);
  const keyboard = keyboardBuilder(buttons);
  bot.sendPhoto(chatId, logo).then(() => {
    bot.sendMessage(chatId, mes_greetings, keyboard);
  });
};

export const sendMainMenu = function (chatId) {
  const mes = 'Оберіть функцію'
  const buttons = [];
  buttons.push([{ text: 'Завантажити документи', callback_data: "define ipn" }]);
  const keyboard = keyboardBuilder(buttons);
  bot.sendMessage(chatId, mes, keyboard);
};

export const sendSorry = function (chatId) {
  const message =
    "Вибачте, але я не знаю такої команди.";
  bot.sendMessage(chatId, message);
};
export const sendMessage = function (chatId, mes = '', buttons = []) {
  const keyboard = keyboardBuilder(buttons);
  bot.sendMessage(chatId, mes, keyboard);
}

export const getImage = async function (chatId, msg) {
  const fileId = msg.photo[msg.photo.length - 1].file_id;
  const getUrl = async function (fileId) {
    return await (await fetch(`https://api.telegram.org/bot${telegramKey}/getFile?file_id=${fileId}`)).json()
  }
  const urlResponse = await getUrl(fileId)
  const filePath = urlResponse.result.file_path
  const image = await fetch(`https://api.telegram.org/file/bot${telegramKey}/${filePath}`)
  return await arrayBufferToBuffer(await image.arrayBuffer());
};


// export const writeImage = async function (ipn, image) {
//   const fileType = await fileTypeFromBuffer(image);
//   const randomName = Math.round(Math.random() * 10000);
//   fs.writeFileSync(
//     path.join(importFolder, 'TG_' + ipn + "_" + randomName + '.' + fileType.ext),
//     image
//   );
//   return 'TG_' + ipn + "_" + randomName + '.' + fileType.ext
// };



export const writeImage = async function (ipn, image, parentId) {
    const fileType = (await fileTypeFromBuffer(image)).ext
  
    const randomName = Math.round(Math.random() * 10000);
    const fileName = 'TG_' + ipn + "_" + randomName + '.' + fileType

    const parentNode = parentId?parentId:(await API.searchQuery(ipn,'cm:folder'))[0].entry.id;

    const nodeInfo = {
      parentId: parentNode,
      file:image,
      nodeBody:{
        name:fileName,
        nodeType:"pa:personelDocument",
        properties:{
          "pa:ipn":ipn,
        }
      },
    }
    const newFileId = await API.uploadFileAsync(nodeInfo)
    return newFileId
  };


export const getFile = async function (chatId, msg) {
  const fileId = msg.document.file_id;
  const urlResponse = await fetch(
    `https://api.telegram.org/bot${telegramKey}/getFile?file_id=${fileId}`
  );
  const response = (await urlResponse.json());
  const filePath = response.result.file_path
  const fileResponse = await fetch(
    `https://api.telegram.org/file/bot${telegramKey}/${filePath}`
  );
  const file = await arrayBufferToBuffer(await fileResponse.arrayBuffer());
  return file;
};
