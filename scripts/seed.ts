// scripts/seed.ts
import "dotenv/config";
import mongoose from "mongoose";
import { faker } from "@faker-js/faker";
import { v4 as uuid } from "uuid";
import bcrypt from "bcryptjs";
import { v2 as cloudinary } from "cloudinary";
import type { UploadApiResponse } from "cloudinary";

import { UserSchema } from "../src/Models/user.model";
import { ProfileSchema } from "../src/Models/profile.model";
import { PhotoSchema } from "../src/Models/photo.model";

const UserModel = mongoose.model("User", UserSchema);
const ProfileModel = mongoose.model("Profile", ProfileSchema);
const PhotoModel = mongoose.model("Photo", PhotoSchema);

const JOB_LIST = [
    "Accountant", "Actor", "Architect", "Artist", "Banker", "Business Analyst",
    "Civil Engineer", "Consultant", "Customer Service", "Data Analyst",
    "Data Scientist", "Designer", "Doctor", "Developer", "Educator",
    "Engineer", "Entrepreneur", "Fashion Designer", "Freelancer",
    "Graphic Designer", "HR Specialist", "Lawyer", "Marketing Specialist",
    "Nurse", "Photographer", "Product Manager", "Project Manager",
    "Scientist", "Software Engineer", "Teacher", "Writer", "KOL", "Other"
];

const UNIVERSITY_LIST = [
    "Đại học Quốc gia Hà Nội", "Đại học Bách khoa Hà Nội", "ĐH KTQD",
    "ĐH Ngoại thương", "ĐH Hà Nội", "ĐH Y Hà Nội", "Học viện Ngoại giao",
    "ĐH KHTN - ĐHQGHN", "ĐH KHXHNV - ĐHQGHN",
    "ĐHQG TP.HCM", "ĐH Bách khoa TP.HCM", "UEH",
    "ĐH Sư phạm TP.HCM", "ĐH FPT", "RMIT Việt Nam",
    "Đại học Đà Nẵng", "ĐH Duy Tân", "ĐH Huế", "ĐH Cần Thơ",
    "VinUni", "Fulbright Việt Nam", "Khác"
];

const VIETNAMESE_LAST_NAMES = [
    "Nguyễn", "Trần", "Lê", "Phạm", "Hoàng", "Huỳnh",
    "Phan", "Vũ", "Võ", "Đặng", "Bùi", "Đỗ",
    "Hồ", "Ngô", "Dương", "Lý"
];

const VIETNAMESE_FIRST_NAMES_MALE = [
    "Nam", "Huy", "Long", "Phúc", "Khang", "Duy",
    "Hiếu", "Tài", "Đạt", "Quân", "Thắng", "Sơn"
];

const VIETNAMESE_FIRST_NAMES_FEMALE = [
    "Lan", "Hương", "Linh", "Trang", "Mai", "Ngọc",
    "Thảo", "Vy", "Nhi", "My", "Hà", "Yến"
];

const TOTAL_USERS = 100;
const CENTER_DA_NANG = { lat: 16.0544, lng: 108.2022 };
const RADIUS_KM = 20;

type UnsplashPhoto = {
    urls?: {
        raw?: string;
        full?: string;
        regular?: string;
    };
};

// Default fallback portrait URLs (Pexels) — stable, no 404
const IMAGE_PARAMS = "?auto=compress&cs=tinysrgb&w=1200";
const FEMALE_PHOTO_URLS = [
    "https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg",
    "https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg",
    "https://images.pexels.com/photos/1181686/pexels-photo-1181686.jpeg",
    "https://images.pexels.com/photos/712521/pexels-photo-712521.jpeg",
    "https://images.pexels.com/photos/733872/pexels-photo-733872.jpeg",
    "https://images.pexels.com/photos/774095/pexels-photo-774095.jpeg",
    "https://images.pexels.com/photos/458766/pexels-photo-458766.jpeg",
    "https://images.pexels.com/photos/1130626/pexels-photo-1130626.jpeg",
    "https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb",
    "https://images.pexels.com/photos/1524503/pexels-photo-1524503.jpeg",
];

const MALE_PHOTO_URLS = [
    "https://images.pexels.com/photos/614810/pexels-photo-614810.jpeg",
    "https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg",
    "https://images.pexels.com/photos/1040880/pexels-photo-1040880.jpeg",
    "https://images.pexels.com/photos/1704488/pexels-photo-1704488.jpeg",
    "https://images.pexels.com/photos/91227/pexels-photo-91227.jpeg",
    "https://images.pexels.com/photos/50855/pexels-photo-50855.jpeg",
    "https://images.pexels.com/photos/936559/pexels-photo-936559.jpeg",
    "https://images.pexels.com/photos/3771835/pexels-photo-3771835.jpeg",
    "https://images.pexels.com/photos/1839564/pexels-photo-1839564.jpeg",
    "https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg",
];

const UNSPLASH_ACCESS_KEY = (process.env.UNSPLASH_ACCESS_KEY || "").trim();
const UNSPLASH_ENDPOINT = "https://api.unsplash.com/photos/random";
const UNSPLASH_QUERY: Record<"male" | "female", string> = {
    male: "portrait face man vietnam",
    female: "portrait face woman vietnam",
};

let PHOTO_POOLS: Record<"male" | "female", string[]> = {
    male: MALE_PHOTO_URLS,
    female: FEMALE_PHOTO_URLS,
};


cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
    api_key: process.env.CLOUDINARY_API_KEY!,
    api_secret: process.env.CLOUDINARY_API_SECRET!,
});

process.on("unhandledRejection", (err) => {
    console.error("❌ Unhandled rejection in seed script:", err);
    process.exit(1);
});


function getRandomDaNangCoords() {
    const radiusInDegrees = RADIUS_KM / 111; // rough conversion
    const u = Math.random();
    const v = Math.random();
    const w = radiusInDegrees * Math.sqrt(u);
    const t = 2 * Math.PI * v;
    const latOffset = w * Math.cos(t);
    const lngOffset = w * Math.sin(t) / Math.cos(CENTER_DA_NANG.lat * Math.PI / 180);

    return {
        lat: CENTER_DA_NANG.lat + latOffset,
        lng: CENTER_DA_NANG.lng + lngOffset,
    };
}

async function uploadCuratedPhoto(gender: "male" | "female"): Promise<UploadApiResponse> {
    const pool = PHOTO_POOLS[gender] || (gender === "female" ? FEMALE_PHOTO_URLS : MALE_PHOTO_URLS);
    const shuffled = faker.helpers.shuffle(pool);

    let lastErr: any = null;
    for (const candidate of shuffled.slice(0, 5)) {
        // Clean common typos like "photto" that may appear in URL strings
        const safeUrl = candidate.replace(/photto/gi, "photo");
        const imageUrl = safeUrl.includes("pexels.com")
            ? `${safeUrl}${safeUrl.includes("?") ? "" : IMAGE_PARAMS}`
            : `${safeUrl}${safeUrl.includes("?") ? "&" : "?"}auto=format&fit=crop&w=1200&q=80`;
        try {
            return await cloudinary.uploader.upload(imageUrl, {
                folder: "dating_seed",
                upload_preset: process.env.CLOUDINARY_UPLOAD_PRESET,
            });
        } catch (err) {
            lastErr = err;
            console.warn(`⚠️ Upload failed for ${imageUrl}, trying next...`, err);
        }
    }
    throw lastErr || new Error("Failed to upload curated photo");
}

async function fetchUnsplashPhotos(gender: "male" | "female", target: number): Promise<string[]> {
    if (!UNSPLASH_ACCESS_KEY) return [];

    const collected = new Set<string>();
    while (collected.size < target) {
        const batch = Math.min(30, target - collected.size);
        const url =
            `${UNSPLASH_ENDPOINT}?query=${encodeURIComponent(UNSPLASH_QUERY[gender])}` +
            `&orientation=portrait&content_filter=high&count=${batch}`;

        const res = await fetch(url, {
            headers: {
                Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}`,
                "Accept-Version": "v1",
            },
        });

        if (!res.ok) {
            throw new Error(`Unsplash error ${res.status}: ${await res.text()}`);
        }

        const data = (await res.json()) as UnsplashPhoto[];
        if (!Array.isArray(data) || data.length === 0) break;

        for (const photo of data) {
            const src = photo?.urls?.regular || photo?.urls?.full || photo?.urls?.raw;
            if (src) collected.add(src);
        }

        if (data.length < batch) break; // avoid infinite loop
    }

    return Array.from(collected);
}

async function buildPhotoPools(): Promise<void> {
    if (!UNSPLASH_ACCESS_KEY) {
        console.log("ℹ️ UNSPLASH_ACCESS_KEY not set or empty, using fallback Pexels pools.");
        PHOTO_POOLS = { male: MALE_PHOTO_URLS, female: FEMALE_PHOTO_URLS };
        return;
    }

    try {
        const targetPerGender = TOTAL_USERS / 2 + 10; // buffer
        const [femalePool, malePool] = await Promise.all([
            fetchUnsplashPhotos("female", targetPerGender),
            fetchUnsplashPhotos("male", targetPerGender),
        ]);

        if (femalePool.length >= TOTAL_USERS / 2 && malePool.length >= TOTAL_USERS / 2) {
            PHOTO_POOLS = { male: malePool, female: femalePool };
            console.log(`✅ Loaded Unsplash pools: female=${femalePool.length}, male=${malePool.length}`);
        } else {
            console.warn(
                `⚠️ Unsplash returned insufficient photos (male=${malePool.length}, female=${femalePool.length}), falling back to Pexels pools.`,
            );
            PHOTO_POOLS = { male: MALE_PHOTO_URLS, female: FEMALE_PHOTO_URLS };
        }
    } catch (err) {
        console.warn("⚠️ Failed to load Unsplash photos, using fallback Pexels pools.", err);
        PHOTO_POOLS = { male: MALE_PHOTO_URLS, female: FEMALE_PHOTO_URLS };
    }
}

function generateVietnameseName(gender: "male" | "female") {
    const lastName = faker.helpers.arrayElement(VIETNAMESE_LAST_NAMES);

    const firstName =
        gender === "male"
            ? faker.helpers.arrayElement(VIETNAMESE_FIRST_NAMES_MALE)
            : faker.helpers.arrayElement(VIETNAMESE_FIRST_NAMES_FEMALE);

    return {
        firstName,
        lastName,
        displayName: `${lastName} ${firstName}`,
    };
}

async function createFakeUser(gender: "male" | "female") {
    const hashed = await bcrypt.hash("test1234", 10);

    const emailLocal = faker.internet.username().toLowerCase();
    const email = `${emailLocal}${faker.number.int({ min: 100, max: 999 })}@gmail.com`;

    const userId = uuid();

    const user = await UserModel.create({
        id: userId,
        email,
        password: hashed,
        status: "active",
        optAttempts: 0,
        lastLogin: new Date(),
        fcmToken: uuid(),
        fcmTokenUpdatedAt: new Date(),
        createdAt: new Date(),
    });

    const { firstName, lastName, displayName } = generateVietnameseName(gender);

    const city = "Đà Nẵng";
    const job = faker.helpers.arrayElement(JOB_LIST);
    const university = faker.helpers.arrayElement(UNIVERSITY_LIST);

    const { lat, lng } = getRandomDaNangCoords();

    const bios = [
        "Yêu cà phê sữa đá, thích đi dạo ven biển và chụp ảnh hoàng hôn.",
        "Đà Nẵng trong tim, cuối tuần hay leo Sơn Trà, rảnh thì xem phim Hàn.",
        "Người hướng ngoại vừa đủ, thích thử quán ăn mới và nói chuyện chân thành.",
        "Thích đọc sách trinh thám, chạy bộ buổi sáng, đang học nấu ăn healthy.",
        "Làm công nghệ, mê du lịch bụi, tìm người đi cùng chuyến miền Trung.",
        "Yêu thú cưng, có một bé mèo lười, muốn tìm bạn cùng dắt mèo đi chơi.",
        "Sống tối giản, thích ngắm mưa ở Đà Nẵng và nghe indie Việt.",
        "Thích cafe sách, nói chuyện về phim, nhạc và những chuyến đi.",
    ];

    const profile = await ProfileModel.create({
        userId,
        firstName,
        lastName,
        displayName,
        bio: faker.helpers.arrayElement(bios),
        city,
        country: "Việt Nam",
        gender,
        education: university,
        job,

        dateOfBirth: faker.date.birthdate({ mode: "age", min: 22, max: 32 }),
        zodiacSign: faker.helpers.arrayElement([
            "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
            "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
        ]),

        height: faker.number.int({ min: 150, max: 199 }),
        weight: faker.number.int({ min: 45, max: 85 }),

        location: {
            type: "Point",
            coordinates: [lng, lat],
        },

        mode: "dating",
        interests: faker.helpers.arrayElements(
            ["Music", "Sports", "Movies", "Pets", "Deep talks"], 3
        ),
        goals: faker.helpers.arrayElements(
            ["Serious relationship", "Just vibing", "New friends", "Something casual"], 2
        ),

        createdAt: new Date(),
        updatedAt: new Date(),
    });

    const uploaded: UploadApiResponse = await uploadCuratedPhoto(gender);

    await PhotoModel.create({
        userId,
        url: uploaded.secure_url,
        cloudinaryPublicId: uploaded.public_id,
        type: "avatar",
        isPrimary: true,
        isActive: true,
        createdAt: new Date(),
    });

}

(async () => {
    try {
        if (!process.env.MONGO_URI || !process.env.MONGO_DB_NAME) {
            throw new Error("Missing MONGO_URI or MONGO_DB_NAME");
        }
        if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
            throw new Error("Missing Cloudinary credentials (cloud_name/api_key/api_secret)");
        }
        if (!process.env.CLOUDINARY_UPLOAD_PRESET) {
            throw new Error("Missing CLOUDINARY_UPLOAD_PRESET");
        }

        await buildPhotoPools();

        await mongoose.connect(process.env.MONGO_URI!, {
            dbName: process.env.MONGO_DB_NAME,
        });

        const genders: ("male" | "female")[] = Array.from({ length: TOTAL_USERS }, (_, idx) =>
            idx < TOTAL_USERS / 2 ? "male" : "female"
        );

        for (const gender of faker.helpers.shuffle(genders)) {
            await createFakeUser(gender);
        }
        console.log(`🎉 DONE! Seeded ${TOTAL_USERS} Da Nang users with balanced gender.`);
        process.exit(0);
    } catch (err) {
        console.error("❌ Seed failed:", err);
        process.exit(1);
    }
})();
