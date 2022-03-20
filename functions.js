import vantage from "./vantage-api/vantage-api.js";
import fs from "file-system";
import fetch from "node-fetch";
import FormData from "form-data";
import path from "path";
import {
  importFolder,
  exportFolder,
  infoPath,
  uploadedFolder,
  skillId,
} from "./settings.js";

export const writer = function (object, filePath) {
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
  fs.writeFileSync(path.join(filePath), JSON.stringify(object, null, "\t"), {
    flag: "w",
  });
};

export const runTransaction = async function () {
  //проверяем наличие незагруженых файлов
  let files = fs.readdirSync(importFolder);
  if (files.length < 1) {
    return;
  }
  
  files.forEach((el)=>{
	  if(el.indexOf('.jpg')!==-1){
		  console.log('.jpg')
		  return
		  }
	  if(el.indexOf('.pdf')!==-1){
		  console.log('.pdf')
		  return
		  }
	  if(el.indexOf('.png')!==-1){
		  console.log('.png')
		  return
		  }
	  if(el.indexOf('.jpeg')!==-1){
		  console.log('.jpeg')
		  return
		  }
	  if(el.indexOf('.xml')!==-1){
		  fs.unlinkSync(path.join(importFolder,el));
		  return
		  }
	  if(fs.lstatSync(path.join(importFolder,el)).isDirectory()){
			try{
				let innerFiles = (fs.readdirSync(path.join(importFolder,el)))
			if(innerFiles.length===0){
				fs.unlinkSync(path.join(importFolder,el));
				return
			}
			let innerFile = innerFiles[0];
			fs.renameSync(
				path.join(importFolder, el, innerFile),
				path.join(importFolder, innerFile)
			);
			return
			}catch(e){
				console.log(e.syscal)
			}
			return
	  }
  })
  files = fs.readdirSync(importFolder);
  const fileName = files.find(el=>{
	  if(el.indexOf('.pdf')!==-1){return el}
	  if(el.indexOf('.jpg')!==-1){return el}
	  if(el.indexOf('.jpeg')!==-1){return el}
	  if(el.indexOf('.png')!==-1){return el}
  })
  if(!fileName){return}
  //const fileName = files.find((el)=>{
	 // if(el.indexOf('.jpg')!==-1){return el}
	//  if(el.indexOf('.pdf')!==-1){return el}
	 // if(el.indexOf('.png')!==-1){return el}
	 // if(el.indexOf('.jpeg')!==-1){return el}
	 // if(fs.lstatSync(path.join(importFolder,el)).isDirectory()){
		//  let innerFiles = (fs.readdirSync(path.join(importFolder,el)))
		//  if(innerFiles.length===0){
		//	  fs.unlinkSync(path.join(importFolder,el));
		//	  }
		//  let innerFile = innerFiles[0]
		//  fs.renameSync(
		//	path.join(importFolder, el, innerFile),
		//	path.join(importFolder, innerFile)
		//	);
		//	fs.unlinkSync(path.join(importFolder, el));
		//	return innerFile
	  //}

  //начинаем загрузку файла в vantage
  const transactionId = await vantage.createTransaction(skillId);
  const formData = new FormData();
  const importPath = path.join(importFolder, fileName);
  formData.append("Files", fs.createReadStream(importPath));
  const fileAdded = await vantage.addFile(transactionId, formData);
  const transactionStarted = await vantage.startTransaction(transactionId);
  const transactionInfo = await vantage.getTransactionInfo(transactionId);
  //если загрузка ОК - сохраняем номер транзакции и перемещаем файл
  if (transactionInfo) {
    const info = JSON.parse(fs.readFileSync(infoPath));
	const newFileName = Math.round((Math.random()*9999))+'_'+fileName
    info.push({
      id: info.length,
      originalName: newFileName,
      transactionId: transactionId,
      status: (await vantage.getTransactionStatus(transactionInfo)).status,
    });
    writer(info, infoPath);
    fs.renameSync(
      path.join(importFolder, fileName),
      path.join(uploadedFolder, newFileName)
    );
    console.log('Новий файл '+newFileName+" відправлено на розпізнавання" )
  } else {
    console.log('some error in "runTransaction()" occurred');
  }
};

// чекер проверяет готовность файла в вантаге и если метаданные есть - выгружает файлы в папку экспорта
export const checker = async function () {
  const info = JSON.parse(fs.readFileSync(infoPath));
  const newInfoPromises = info.map(async (el) => {
    if (el.status === "Processed" || el.status === "Uploaded") {
      return new Promise((resolve) => resolve(el));
    }
    const transactionId = el.transactionId;
    const transactionInfo = await vantage.getTransactionInfo(transactionId);
    const transactionStatus = await vantage.getTransactionStatus(
      transactionInfo
    );
    if (transactionStatus !== "Processed") {
      return new Promise((resolve) => resolve(el));
    }

    return new Promise(async (resolve) => {
      //появилось запроцешеное дело - надо получить файлики
      const transactionClass = await vantage.getTransactionClass(
        transactionInfo
      );
      const metaDataFileId = await vantage.getTransactionMetaId(
        transactionInfo
      );
      const pdfFileId = await vantage.getTransactionResultId(transactionInfo);
      const metaDataFile = await vantage.getFile(transactionId, metaDataFileId);
      const pdfFile = await vantage.getFile(transactionId, pdfFileId);

      //теперь их надо записать
      fs.writeFileSync(
        path.join(exportFolder, el.originalName + ".json"),
        metaDataFile
      );
      fs.writeFileSync(
        path.join(exportFolder, el.originalName + ".pdf"),
        pdfFile
      );
      //сохраняем инфу в обьект инфо (вместо базы)
      let index = info.findIndex(
        (infoElem) => infoElem.transactionId === el.transactionId
      );
      el.class = transactionClass;
      el.metaDataFile = path.join(exportFolder, el.originalName + ".json");
      el.pdfFile = path.join(exportFolder, el.originalName + ".pdf");
      if(el.status!=='Processed'||el.status!=='Uploaded'){
        el.status = transactionStatus;
      }
      
    console.log('Отримані результати розпізнавання '+el.originalName+"" )
      resolve(el) 
    });
  });
  Promise.all(newInfoPromises).then((data) => {
    writer(data, infoPath); // записываем новую версию файла
  });
};
