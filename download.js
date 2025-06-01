import fs from 'fs'
import path from 'path'
import axios from 'axios'
import { mkdir } from 'fs/promises'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const HUB_NAME = "Victor's Hub";
const PROJECT_NAME = 'New Project';
const DOWNLOAD_DIR = path.join(__dirname, 'downloads', PROJECT_NAME);

export async function downloadFusionFiles(access_token) {
  const headers = { Authorization: `Bearer ${access_token}` }

  // Step 1: Get hubs
  const { data: hubs } = await axios.get('https://developer.api.autodesk.com/project/v1/hubs', { headers })
  const hubName = hubs.data.find(h => h.attributes.name === HUB_NAME)
  if (!hubName) {
    console.error(`❌ ${HUB_NAME} not found.`)
    return
  }

  const hubId = hubName.id
  console.log(`🔷 Found hub ${HUB_NAME}: ${hubId}`)

  // Step 2: Get projects in Victor's Hub
  const { data: projects } = await axios.get(`https://developer.api.autodesk.com/project/v1/hubs/${hubId}/projects`, { headers })
  const p = projects.data.find(p => p.attributes.name === PROJECT_NAME)
  if (!p) {
    console.error(`❌ ${PROJECT_NAME} not found.`)
    return
  }

  const projectId = p.id
  console.log(`🔷 Found project ${PROJECT_NAME}: ${projectId}`)

  // Step 3: Get folders
  const folders = await getTopFoldersOrFallback(hubId, projectId, headers)
  for (const folder of folders) {
    console.log(`🔍 Traversing folder: ${folder.attributes.displayName} (${folder.id})`)
    await traverseFolder(projectId, folder.id, 'Personal', headers)
  }
}

async function getTopFoldersOrFallback(hubId, projectId, headers) {
  try {
    const { data } = await axios.get(
      `https://developer.api.autodesk.com/project/v1/hubs/${hubId}/projects/${projectId}/topFolders`,
      { headers }
    )
    return data.data
  } catch {
    try {
      const { data } = await axios.get(
        `https://developer.api.autodesk.com/data/v1/projects/${projectId}/folders/root/contents`,
        { headers }
      )
      return data.data.filter(item => item.type === 'folders')
    } catch (err) {
      console.error(`❌ Could not get folders for Personal Project: ${err.message}`)
      return []
    }
  }
}

async function traverseFolder(projectId, folderId, projectName, headers) {
  const { data } = await axios.get(
    `https://developer.api.autodesk.com/data/v1/projects/${projectId}/folders/${folderId}/contents`,
    { headers }
  )

  for (const item of data.data) {
    console.log(`📁 ${item.attributes.displayName} (${item.id})`)
    if (item.type === 'folders') {
      await traverseFolder(projectId, item.id, projectName, headers)
    } else if (item.type === 'items') {
      const name = item.attributes.displayName
      const itemId = item.id
      console.log(`🔧 Found item: ${item.attributes.displayName} (${item.id})`)

      try {
        console.log(`🔄 Fetching item metadata: ${name} (${itemId})`)
        const { data: itemMeta } = await axios.get(
          `https://developer.api.autodesk.com/data/v1/projects/${projectId}/items/${itemId}`,
          { headers }
        )

        const bucketLocation = itemMeta.included[0].relationships.storage.meta.link.href;
        const fileExtension = bucketLocation.split('?')[0].split('.').pop();
        const signedUrlEndpoint = bucketLocation.split('?')[0] + '/signeds3download';
        console.log(`📦 Hitting Endpoint: ${signedUrlEndpoint}`)

        let downloadUrl = ''
        try {
          const { data: signed } = await axios.get(signedUrlEndpoint, { headers })
          downloadUrl = signed.url;
        } catch (err) {
          console.error(`❌ Error getting signed URL for ${name}: ${err.message}. Attempted to get signed URL from: ${signedUrlEndpoint}`)
          continue
        }

        if (!downloadUrl) {
          console.warn(`⚠️ No download URL available for ${name}`)
          continue
        }

        const safeName = sanitize(`${projectName}_${name}.${fileExtension}`)
        const savePath = path.join(DOWNLOAD_DIR, safeName)
        console.log(`📥 Downloading ${name} from ${downloadUrl}`)
        await downloadFile(downloadUrl, savePath)
      } catch (err) {
        console.error(`❌ Error downloading ${name}: ${err.message}`)
      }
    }
  }
}

async function downloadFile(url, filePath) {
  await mkdir(path.dirname(filePath), { recursive: true })
  const writer = fs.createWriteStream(filePath)
  const { data } = await axios.get(url, { responseType: 'stream' })

  return new Promise((resolve, reject) => {
    data.pipe(writer)
    writer.on('finish', () => {
      console.log(`✅ Saved to: ${filePath}`)
      resolve()
    })
    writer.on('error', reject)
  })
}

function sanitize(name) {
  return name.replace(/[<>:"/\\|?*\x00-\x1F]/g, '_')
}