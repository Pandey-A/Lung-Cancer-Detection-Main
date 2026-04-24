import { MongoClient } from "mongodb"

const globalForMongo = globalThis as {
  __lungifyMongoClientPromise?: Promise<MongoClient>
}

function getClientPromise() {
  const uri = process.env.MONGODB_URI

  if (!uri) {
    throw new Error("Missing MONGODB_URI environment variable")
  }

  if (!globalForMongo.__lungifyMongoClientPromise) {
    const client = new MongoClient(uri)
    globalForMongo.__lungifyMongoClientPromise = client.connect()
  }

  return globalForMongo.__lungifyMongoClientPromise
}

export async function getDb() {
  const clientPromise = getClientPromise()
  const connectedClient = await clientPromise
  return connectedClient.db(process.env.MONGODB_DB_NAME || "lungify")
}
