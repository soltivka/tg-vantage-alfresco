
import pkg from '@alfresco/js-api';
const { AlfrescoApi, NodesApi, QueriesApi } = pkg;
import { alfrescoHost, alfrescoAuth, alfrescoApiPath, alfrescoMainDirectory } from '../settings.js'
import FormData from 'form-data'
import fs from 'file-system'
import path from 'path'
import fetch from 'node-fetch'

const alfrescoJsApi = new AlfrescoApi({
    hostEcm: alfrescoHost,
});




export const API = {
    getToken: async function () {
        alfrescoJsApi.login(alfrescoAuth.login, alfrescoAuth.password).then(
            async (data) => {
                alfrescoAuth.ticket = data;
            },
            error => {
            }
        );
    },

    searchQuery: async function (searchString,nodeType) {                                                // надо будет переписать по-нормельному
        const token = await this.getToken()
        const queriesApi = new QueriesApi(alfrescoJsApi)//alfrescoJsApi.core.queriesApi;
        const opts = { 'rootNodeId': alfrescoMainDirectory };
        const response = await queriesApi.findNodes(searchString, opts)
        if(nodeType){
            let filtred = response.list.entries.filter((NodeEntry)=>{
                return NodeEntry.entry.nodeType===nodeType
            })
            return filtred
        }
        return response.list.entries
    },

    createNodeAsync: async function (parentId, contentInfo) {                                     // создать узел в альфреско (файл или папку)
        // create empty node, body = type + properties + aspects
        const nodesApi = new NodesApi(alfrescoJsApi);
        const opts = { 'autoRename': false }
        const nodeBody = contentInfo; //     {"name": "My Folder 1", "nodeType": "cm:content"},
        const response = await nodesApi.createNode(parentId, nodeBody, opts);
        return response.entry.id;
    },


    updateContentAsync: async function (parentId, content) {                                   //запхать контент (файл) в узел 
        const nodesApi = new NodesApi(alfrescoJsApi);
        const opts = {
            majorVersion: true, // add new version of this node. Auto enables node versioning
        };
        const response = await nodesApi.updateNodeContent(parentId, content, opts);
        return response;
    },


    uploadFileAsync: async function (nodeInfo) {                                                  //базовая функция, пользоваться ею.
        const newNodeId = await this.createNodeAsync(nodeInfo.parentId, nodeInfo.nodeBody);
        const uploadResult = await this.updateContentAsync(newNodeId, nodeInfo.file);
        return await uploadResult.entry.id
    },

}


