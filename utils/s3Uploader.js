const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const fs = require('fs');
const path = require('path');

const s3 = new S3Client({
  region: 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'AKIAQWBA6OZVSXZFN3VB',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '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'
  }
});

async function uploadProfileImage(localFilePath, filename) {
  const fileStream = fs.createReadStream(localFilePath);

  const uploadParams = {
    Bucket: 'prepzer0testbucket',
    Key: `profile/${filename}`,
    Body: fileStream,
    ContentType: 'image/jpeg' // or infer type dynamically
  };

  await s3.send(new PutObjectCommand(uploadParams));

  return `https://prepzer0testbucket.s3.amazonaws.com/profile/${filename}`;
}

module.exports = { uploadProfileImage };
