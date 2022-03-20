import TelegramBot from "node-telegram-bot-api";
import { bot, sendGreetings, sendMainMenu, sendMessage, sendSorry, getImage, writeImage, getFile } from "./functions.js";
import { alfrescoMainDirectory } from '../settings.js'
import { DB } from '../db.js'
import { API } from '../alfresco/alfrescoApi.js'
const waitingNewIpn = 'waiting new ipn'
const waitingDocuments = 'waiting for documents'
const clearState = 'clearState'

const state = {};

bot.on("text", async (msg) => {
    const chatId = msg.chat.id;
    if (msg.text === "/start") {
        delete state[chatId]
        sendGreetings(chatId);
        return
    }
    if (state[chatId] &&
         state[chatId].state === waitingNewIpn&&
         msg.text.length===10&&
         Number(msg.text)
         ) {
        const response = await API.searchQuery(msg.text,'cm:folder')
        state[chatId].ipn = msg.text;
        state[chatId].state = waitingDocuments;
        if (response.length === 0) {
            const response = await API.createNodeAsync(alfrescoMainDirectory,
                { "name": msg.text, "nodeType": "cm:folder" })
                state[chatId].parentId = response
            DB.update(state[chatId].ipn, { name: 'chatId', value: chatId })
            sendMessage(chatId, msg.text + ' - Цієї особи не було зареєстровано раніше, створено пустий архів документів. Надайте фото документів або натисніть кнопку "Завершити"',
                [{ text: 'Завершити завантаження документів', callback_data: clearState }])
        } else {
            sendMessage(chatId, 'Набір документів ' + state[chatId].ipn + ' знайдено.  Надайте фото документів або натисніть кнопку "Завершити"',
                [{ text: 'Завершити завантаження документів', callback_data: clearState }])
        }
        return
    }else{
        sendMessage(chatId, 'Не вірний формат ІПН',
        [{ text: 'Повернутись до головного меню', callback_data: clearState }])
    }
    if(true){
        sendMessage(chatId, 'Не зазначено ІПН. ',
                [{ text: 'Повернутись до головного меню', callback_data: clearState }])

    }
});
bot.on('photo', async (msg) => {
    const chatId = msg.chat.id;
    if (state[chatId] && state[chatId].ipn) {
        const image = await getImage(chatId, msg)
        await writeImage(state[chatId].ipn, image, state[chatId].parentId) // saves image on server 
        const imageName = msg.photo[msg.photo.length - 1].file_name;
        DB.update(state[chatId].ipn, { name: imageName, value: '' })
        sendMessage(chatId,
             'Зображення відправлено в обробку. Завантажте наступне зображення.',
             [{ text: 'Повернутись до головного меню', callback_data: clearState }]
             )
    } else {
        sendMessage(chatId, 'Не вказано ІПН особи, щодо якої надаються документи')
    }

})

bot.on('document', async (msg) => {
    const chatId = msg.chat.id;
    if (msg.document.mime_type === 'application/pdf') {
        if (state[chatId] && state[chatId].ipn) {
            const document = await getFile(chatId, msg)
            const imageName = await writeImage(state[chatId].ipn, document,state[chatId].parentId) // saves image on server 
            DB.update(state[chatId].ipn, { name: imageName, value: '' })
            sendMessage(chatId, 'Документ ' + imageName + ' відправлено в обробку.')
        }else{
            sendMessage(chatId, 'Не вказано ІПН особи, щодо якої надаються документи')
        }

    } else {
        sendMessage(chatId, 'Підтримуються тільки зображення, або файли формату .pdf')
    }
})
bot.on("polling_error", console.log);

bot.on("callback_query", (query) => {
    const chatId = query.message.chat.id;
    const callback = query.data
    let txt = "";
    if (query.data === "define ipn") {
        state[chatId] = { state: waitingNewIpn }
        sendMessage(chatId, 'Введіть ІПН особи, документи якої збираєтесь надати')
    }

    if (query.data === clearState) {
        delete state[chatId]
        sendGreetings(chatId)
    }
})







//let buttons = [];
// buttons.push({ text: mes_ok, callback_data: "sendToBitrix" });
// buttons.push({ text: mes_restart, callback_data: "vacancies" });
// buttons.push({ text: mes_mainMenuButton, callback_data: "mainMenu" });
