import fs from 'file-system'
import { infoPath } from './settings.js'
import path from 'path'

const writer = function (object, filePath) {
    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
    }
    fs.writeFileSync(path.join(filePath), JSON.stringify(object, null, "\t"), {
        flag: "w",
    });
};


export const DB = {
    update: function (ipn, property) {
        let db = JSON.parse(fs.readFileSync(infoPath));
        const { name, value } = property
        if (!db[ipn]) {
            db[ipn] = {}
        }
        db[ipn][name] = value;
        writer(db, infoPath)
        return db[ipn]
    },
    create:function(ipn){
        let db = JSON.parse(fs.readFileSync(infoPath));
        if(!db[ipn]){
            db[ipn] = {}
        }
        writer(db, infoPath)
        return db[ipn]
    },

    read: function (ipn) {
        const db = JSON.parse(fs.readFileSync(infoPath));
        return db[ipn]
    },

    deleteElement: function (ipn) {
        let db = JSON.parse(fs.readFileSync(infoPath));
        delete db[ipn];
        writer(db, infoPath)
        return db[ipn]
    },
    clear: function () {
        let db = {}
        writer(db, infoPath)
    }
}