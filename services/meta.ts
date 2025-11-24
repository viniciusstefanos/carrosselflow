import { InstagramUser } from "../types";

// NOTE: In a production environment, you cannot host images directly from the browser to Instagram API.
// Instagram requires public URLs (e.g., https://your-bucket.s3.amazonaws.com/image.png).
// This service simulates the upload step for demonstration purposes, but contains the real logic for the Graph API structure.

const API_VERSION = 'v19.0';
export const MOCK_USER_ID = '123456789';

declare global {
  interface Window {
    FB: any;
    fbAsyncInit: () => void;
  }
}

export const initFacebookSdk = (appId: string): Promise<void> => {
  return new Promise((resolve) => {
    // SSR Check: If window is undefined, resolve immediately to avoid crashes
    if (typeof window === 'undefined') {
      resolve();
      return;
    }

    if (window.FB) {
      resolve();
      return;
    }

    window.fbAsyncInit = () => {
      window.FB.init({
        appId: appId,
        cookie: true,
        xfbml: true,
        version: API_VERSION,
      });
      resolve();
    };

    // Load the SDK asynchronously
    (function (d, s, id) {
      var js, fjs = d.getElementsByTagName(s)[0];
      if (d.getElementById(id)) return;
      js = d.createElement(s) as HTMLScriptElement; 
      js.id = id;
      js.src = "https://connect.facebook.net/en_US/sdk.js";
      if(fjs && fjs.parentNode) fjs.parentNode.insertBefore(js, fjs);
    }(document, 'script', 'facebook-jssdk'));
  });
};

const fetchInstagramAccount = async (accessToken: string): Promise<InstagramUser> => {
  // 1. Get User's Pages
  const pagesRes = await fetch(`https://graph.facebook.com/${API_VERSION}/me/accounts?access_token=${accessToken}`);
  const pagesData = await pagesRes.json();
  
  if (!pagesData.data || pagesData.data.length === 0) {
    throw new Error("No Facebook Pages found. Please create a Page to connect Instagram.");
  }

  // 2. Find a page with a connected Instagram Business Account
  let igUserId = null;
  let pageName = "";
  
  for (const page of pagesData.data) {
     const pageRes = await fetch(`https://graph.facebook.com/${API_VERSION}/${page.id}?fields=instagram_business_account&access_token=${accessToken}`);
     const pageDetails = await pageRes.json();
     
     if (pageDetails.instagram_business_account) {
        igUserId = pageDetails.instagram_business_account.id;
        pageName = page.name;
        break; 
     }
  }

  if (!igUserId) {
    throw new Error("No Instagram Business Account connected to your Facebook Pages.");
  }

  // 3. Get IG User Details
  const igUserRes = await fetch(`https://graph.facebook.com/${API_VERSION}/${igUserId}?fields=id,username,name,profile_picture_url&access_token=${accessToken}`);
  const igUser = await igUserRes.json();

  return {
    id: igUser.id,
    name: igUser.name || pageName,
    username: igUser.username,
    profile_picture_url: igUser.profile_picture_url,
    accessToken: accessToken 
  };
};

export const loginToInstagram = async (appId?: string): Promise<InstagramUser> => {
  // SSR Safety
  if (typeof window === 'undefined') {
     return {
        id: MOCK_USER_ID,
        name: 'SSR User',
        username: 'ssr_user',
        accessToken: 'mock_token'
     };
  }

  // Use passed App ID or fallback to env var
  const finalAppId = appId || process.env.REACT_APP_FB_APP_ID;

  // STRICT CHECK: Facebook Login absolutely requires HTTPS or Localhost.
  // We check window.location to prevent the SDK from throwing a hard error.
  const isSecure = window.location.protocol === 'https:';
  const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const canUseRealAuth = finalAppId && (isSecure || isLocal);

  // Attempt Real Auth if environment permits
  if (canUseRealAuth) {
      try {
        await initFacebookSdk(finalAppId);

        return await new Promise((resolve, reject) => {
          // Fix: Ensure callback is a standard synchronous function to match SDK signature
          window.FB.login((response: any) => {
            if (response.authResponse) {
              const accessToken = response.authResponse.accessToken;
              // Handle async operations via promise chain
              fetchInstagramAccount(accessToken)
                .then(user => resolve(user))
                .catch(err => reject(err));
            } else {
              reject(new Error('User cancelled login or did not fully authorize.'));
            }
          }, { scope: 'instagram_basic,instagram_content_publish,pages_show_list,pages_read_engagement' });
        });
      } catch (error) {
         console.warn("Real Authentication failed or was cancelled. Falling back to simulation.", error);
         // Fall through to mock logic below
      }
  } else if (finalAppId) {
    // If user provided an App ID but we are on HTTP, log warning but don't crash/alert.
    console.warn("Meta API: HTTPS required for Facebook Login. Switching to Simulation Mode.");
  }

  // Mock Logic (Fallback)
  await new Promise(r => setTimeout(r, 800));
  return {
    id: MOCK_USER_ID,
    name: 'Demo User',
    username: 'demo_creator',
    accessToken: 'mock_token_123'
  };
};

// 1. Upload local Blob to a Public Server (Mocked)
const uploadImageToPublicServer = async (blob: Blob): Promise<string> => {
  // REAL WORLD: You would upload 'blob' to S3/Cloudinary/Firebase Storage here.
  // API Return: "https://your-bucket.com/generated-uuid.png"
  
  // SIMULATION: We just return a placeholder URL because we can't upload from this sandbox.
  console.log("Uploading blob to server...", blob.size);
  await new Promise(r => setTimeout(r, 1500)); // Simulate realistic network lag
  
  // Return a random Unsplash image to simulate a successful upload that Instagram can read
  return `https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=1080&q=80&random=${Math.random()}`; 
};

// 2. Create Item Container
const createItemContainer = async (userId: string, imageUrl: string, accessToken: string, caption: string = '', isCarouselItem: boolean = true) => {
  let url = `https://graph.facebook.com/${API_VERSION}/${userId}/media?image_url=${encodeURIComponent(imageUrl)}&access_token=${accessToken}`;
  
  if (isCarouselItem) {
    url += `&is_carousel_item=true`;
  } else {
    url += `&caption=${encodeURIComponent(caption)}`;
  }
  
  // MOCK CHECK
  if (userId === MOCK_USER_ID) {
    console.log(`[Mock] Creating Item Container (CarouselItem: ${isCarouselItem})`);
    await new Promise(r => setTimeout(r, 500));
    return { id: `item_container_${Date.now()}_${Math.random()}` };
  }

  const res = await fetch(url, { method: 'POST' });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data;
};

// 3. Create Carousel Container
const createCarouselContainer = async (userId: string, childrenIds: string[], accessToken: string, caption: string) => {
  const url = `https://graph.facebook.com/${API_VERSION}/${userId}/media?media_type=CAROUSEL&children=${childrenIds.join(',')}&caption=${encodeURIComponent(caption)}&access_token=${accessToken}`;
  
  if (userId === MOCK_USER_ID) {
    console.log(`[Mock] Creating Carousel Container with children: ${childrenIds.length}`);
    await new Promise(r => setTimeout(r, 800));
    return { id: `carousel_container_${Date.now()}` };
  }

  const res = await fetch(url, { method: 'POST' });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data;
};

// 4. Publish
const publishMedia = async (userId: string, creationId: string, accessToken: string) => {
  const url = `https://graph.facebook.com/${API_VERSION}/${userId}/media_publish?creation_id=${creationId}&access_token=${accessToken}`;
  
  if (userId === MOCK_USER_ID) {
    console.log(`[Mock] Publishing Media ID: ${creationId}`);
    await new Promise(r => setTimeout(r, 1200));
    return { id: `published_media_${Date.now()}` };
  }

  const res = await fetch(url, { method: 'POST' });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data;
};


export const publishCarouselToInstagram = async (
  user: InstagramUser,
  slideBlobs: Blob[],
  caption: string,
  onProgress?: (status: string) => void
) => {
  try {
    // Step 1: Upload all images to a public server
    const imageUrls: string[] = [];
    for (let i = 0; i < slideBlobs.length; i++) {
        if (onProgress) onProgress(`Uploading slide ${i + 1} of ${slideBlobs.length}...`);
        const url = await uploadImageToPublicServer(slideBlobs[i]);
        imageUrls.push(url);
    }
    
    let creationId = '';

    // Step 2: Create Containers
    if (imageUrls.length === 1) {
       // Single Image Post
       if (onProgress) onProgress(`Creating media container...`);
       const container = await createItemContainer(user.id, imageUrls[0], user.accessToken, caption, false);
       creationId = container.id;
    } else {
       // Carousel Post
       const itemContainers = [];
       for (let i = 0; i < imageUrls.length; i++) {
         if (onProgress) onProgress(`Preparing slide ${i + 1} for Instagram...`);
         const url = imageUrls[i];
         const container = await createItemContainer(user.id, url, user.accessToken, '', true);
         itemContainers.push(container.id);
       }
       
       if (onProgress) onProgress(`Creating carousel object...`);
       const carouselContainer = await createCarouselContainer(user.id, itemContainers, user.accessToken, caption);
       creationId = carouselContainer.id;
    }

    // Step 3: Publish
    if (onProgress) onProgress(`Finalizing publication...`);
    const result = await publishMedia(user.id, creationId, user.accessToken);
    
    return result;
  } catch (error) {
    console.error("Publishing failed:", error);
    throw error;
  }
};