const IMGBB_KEY = '381e2030609c36956658a101f7b4ce63';

export const uploadImagesToImgBB = async (base64Array: string[]): Promise<string[]> => {
  const uploads = base64Array.map(async (dataUri, i) => {
    // Nếu đã là URL (http/https) thì không cần upload lại
    if (dataUri.startsWith('http')) return dataUri;

    const raw = dataUri.includes(',') ? dataUri.split(',')[1] : dataUri;
    const form = new FormData();
    form.append('image', raw);
    form.append('name', `post_image_${i + 1}_${Date.now()}`);

    const res = await fetch(
      `https://api.imgbb.com/1/upload?key=${IMGBB_KEY}`,
      { method: 'POST', body: form }
    );
    const data = await res.json();
    if (!data.success) throw new Error(`ImgBB upload failed: ${data.error?.message}`);
    return data.data.url;
  });

  return Promise.all(uploads); // Upload song song tất cả ảnh
};
