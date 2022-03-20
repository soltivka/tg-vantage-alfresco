import vantage from "./vantage-api/vantage-api.js";
import fs from "file-system";
import fetch from "node-fetch";
import FormData from "form-data";
import path from "path";

import { runTransaction, writer, checker } from "./functions.js";
import {
  importFolder,
  exportFolder,
  infoPath,
  uploadedFolder,
  skillId,
} from "./settings.js";
import { runInNewContext } from "vm";
import { resolve } from "path/posix";


const bxChecker = async function () {
  const bxChecked = await BX.checker();
  
  const needToUpload = bxChecked.filter(
    (el) => el.status === "Processed" && el.fields
  );
  const uploadedPromises = BX.thrower(needToUpload);
  const uploadedElems = await Promise.all(await uploadedPromises);
  uploadedElems.forEach((el) => {
    if (!el) {
      return;
    }
    const index = bxChecked.findIndex((checked) => checked.id === el.id);
    bxChecked[index] = el;
  });
  writer(bxChecked, infoPath);
};

const stepper = async function(i){
    await runTransaction();// запускает файлик в вантаг если есть такой в папке импорта
    await checker();// ждет, пока данные появятся в вантаге и скачивает результаты верификации
    await bxChecker();// берет результаты обработки вантага и кидает в битрикс
    runNextStep(i+1)
    console.log('Сервер працює...' + i)
    return
}
const runNextStep = function(i){
    let p = new Promise(resolve=>{
        setTimeout(()=>{
            stepper(i)
            resolve()
        },5000)
    })
}
runNextStep(1)


