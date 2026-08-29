require('dotenv').config();
const { connectDb } = require('../config/db');
const Artist = require('../models/Artist');
const BattleEvent = require('../models/BattleEvent');

const data = [
  {
    stageName: 'Sơn Tùng M-TP',
    realName: 'Nguyễn Thanh Tùng',
    primaryProfession: 'singer',
    professions: ['singer', 'rapper', 'dancer'],
    gender: 'male',
    grade: 'S',
    company: 'M-TP Entertainment',
    avatarUrl: '',
    bio: 'Ca sĩ, nhạc sĩ, rapper Việt Nam với nhiều bản hit đại chúng và fandom mạnh.',
    trendingReason: 'Lượng thảo luận tăng nhờ sản phẩm mới, fandom hoạt động mạnh và nhiều bản hit được nghe lại.',
    hashtags: ['genz', 'vpop', 'singer', 'rapper'],
    works: [
      { kind: 'song', title: 'Hãy Trao Cho Anh', url: 'https://www.youtube.com/results?search_query=Hay+Trao+Cho+Anh', viewCount: 300000000, impactScore: 96, isSignature: true },
      { kind: 'song', title: 'Chúng Ta Của Tương Lai', url: 'https://www.youtube.com/results?search_query=Chung+Ta+Cua+Tuong+Lai', viewCount: 100000000, impactScore: 88 }
    ],
    awards: [{ name: 'Làn Sóng Xanh', category: 'Ca sĩ', year: 2015, weight: 15 }],
    timeline: [{ date: new Date('2019-07-01'), title: 'Hãy Trao Cho Anh tạo hiệu ứng lớn', description: 'MV đạt lượng quan tâm cao trên YouTube.' }],
    skills: { vocal: 82, rap: 76, dance: 78, acting: 55, diction: 75, stagePresence: 92 },
    metrics: { fanCount: 14000000, youtubeViews: 2600000000, spotifyStreams: 200000000, boxOfficeRevenue: 0, tvRating: 0, mediaMentions: 95000, socialBuzz: 82, buzzGrowthPercent: 60, webVotes: 1200 },
    hallOfFameTags: ['billion_views']
  },
  {
    stageName: 'Mỹ Tâm',
    realName: 'Phan Thị Mỹ Tâm',
    primaryProfession: 'singer',
    professions: ['singer'],
    gender: 'female',
    grade: 'S',
    company: 'MT Entertainment',
    bio: 'Ca sĩ có sức ảnh hưởng lớn trong nhạc Việt, nổi bật về giọng hát và lượng fan bền vững.',
    trendingReason: 'Độ nhận diện lâu dài, concert và catalogue hit giúp điểm chuyên môn duy trì cao.',
    hashtags: ['diva', 'vpop', 'legacy'],
    works: [
      { kind: 'song', title: 'Đâu Chỉ Riêng Em', url: 'https://www.youtube.com/results?search_query=Dau+Chi+Rieng+Em+My+Tam', viewCount: 130000000, impactScore: 94, isSignature: true },
      { kind: 'song', title: 'Người Hãy Quên Em Đi', url: 'https://www.youtube.com/results?search_query=Nguoi+Hay+Quen+Em+Di', viewCount: 120000000, impactScore: 90 }
    ],
    awards: [{ name: 'Cống hiến', category: 'Album/ca sĩ', year: 2018, weight: 20 }, { name: 'Mai Vàng', category: 'Ca sĩ', year: 2020, weight: 15 }],
    skills: { vocal: 96, rap: 20, dance: 62, acting: 60, diction: 88, stagePresence: 90 },
    metrics: { fanCount: 9000000, youtubeViews: 1200000000, spotifyStreams: 180000000, mediaMentions: 65000, socialBuzz: 70, buzzGrowthPercent: 25, webVotes: 980 },
    hallOfFameTags: ['legacy_icon', 'award_sweeper']
  },
  {
    stageName: 'Đen Vâu',
    realName: 'Nguyễn Đức Cường',
    primaryProfession: 'rapper',
    professions: ['rapper', 'singer'],
    gender: 'male',
    grade: 'A',
    bio: 'Rapper được yêu thích nhờ ca từ gần gũi và nhiều sản phẩm viral.',
    trendingReason: 'Ca từ đời thường và tính cộng đồng giúp thảo luận tích cực ổn định.',
    hashtags: ['rapviet', 'rapper', 'lyrics'],
    works: [
      { kind: 'song', title: 'Mang Tiền Về Cho Mẹ', url: 'https://www.youtube.com/results?search_query=Mang+Tien+Ve+Cho+Me', viewCount: 160000000, impactScore: 92, isSignature: true },
      { kind: 'song', title: 'Bài Này Chill Phết', url: 'https://www.youtube.com/results?search_query=Bai+Nay+Chill+Phet', viewCount: 180000000, impactScore: 91 }
    ],
    awards: [{ name: 'Cống hiến', category: 'Music video', year: 2020, weight: 15 }],
    skills: { vocal: 58, rap: 94, dance: 35, acting: 40, diction: 86, stagePresence: 80 },
    metrics: { fanCount: 5500000, youtubeViews: 1300000000, spotifyStreams: 220000000, mediaMentions: 48000, socialBuzz: 76, buzzGrowthPercent: 45, webVotes: 850 },
    hallOfFameTags: ['billion_views']
  },
  {
    stageName: 'Trấn Thành',
    realName: 'Huỳnh Trấn Thành',
    primaryProfession: 'actor',
    professions: ['actor', 'mc'],
    gender: 'male',
    grade: 'S',
    bio: 'Diễn viên, MC, đạo diễn có ảnh hưởng lớn trong điện ảnh và giải trí Việt Nam.',
    trendingReason: 'Doanh thu phòng vé và độ phủ truyền thông cao khiến điểm thành tích tăng mạnh.',
    hashtags: ['actor', 'boxoffice', 'cinema'],
    works: [
      { kind: 'movie', title: 'Mai', boxOfficeRevenue: 520000000000, impactScore: 95, isSignature: true },
      { kind: 'movie', title: 'Bố Già', boxOfficeRevenue: 420000000000, impactScore: 92 }
    ],
    awards: [{ name: 'Cánh Diều Vàng', category: 'Điện ảnh', year: 2021, weight: 18 }],
    skills: { vocal: 60, rap: 35, dance: 45, acting: 88, diction: 92, stagePresence: 93 },
    metrics: { fanCount: 18000000, youtubeViews: 900000000, boxOfficeRevenue: 940000000000, mediaMentions: 120000, socialBuzz: 80, buzzGrowthPercent: 55, webVotes: 700 },
    hallOfFameTags: ['trillion_box_office']
  },
  {
    stageName: 'Ninh Dương Lan Ngọc',
    realName: 'Ninh Dương Lan Ngọc',
    primaryProfession: 'actor',
    professions: ['actor', 'dancer'],
    gender: 'female',
    grade: 'A',
    bio: 'Diễn viên nổi bật trong phim điện ảnh, truyền hình và chương trình giải trí.',
    trendingReason: 'Độ thảo luận tăng nhờ show giải trí, hình ảnh tích cực và khả năng vũ đạo.',
    hashtags: ['actor', 'showbiz', 'dancer'],
    works: [
      { kind: 'movie', title: 'Gái Già Lắm Chiêu', boxOfficeRevenue: 165000000000, impactScore: 85, isSignature: true },
      { kind: 'show', title: 'Chị Đẹp Đạp Gió', viewCount: 60000000, impactScore: 88 }
    ],
    awards: [{ name: 'Cánh Diều Vàng', category: 'Diễn viên', year: 2010, weight: 15 }],
    skills: { vocal: 55, rap: 30, dance: 82, acting: 86, diction: 82, stagePresence: 88 },
    metrics: { fanCount: 7000000, youtubeViews: 350000000, boxOfficeRevenue: 220000000000, mediaMentions: 70000, socialBuzz: 78, buzzGrowthPercent: 95, webVotes: 620 }
  },
  {
    stageName: 'MONO',
    realName: 'Nguyễn Việt Hoàng',
    primaryProfession: 'singer',
    professions: ['singer', 'dancer'],
    gender: 'male',
    grade: 'B',
    bio: 'Ca sĩ trẻ có sức hút sân khấu và nhiều màn trình diễn viral.',
    trendingReason: 'Điểm breakout cao nhờ lượng thảo luận tăng nhanh và các clip trình diễn lan truyền.',
    hashtags: ['genz', 'breakout', 'dancer'],
    works: [{ kind: 'song', title: 'Waiting For You', viewCount: 120000000, impactScore: 86, isSignature: true }],
    awards: [{ name: 'Làn Sóng Xanh', category: 'Nghệ sĩ mới', year: 2022, weight: 10 }],
    skills: { vocal: 72, rap: 35, dance: 85, acting: 40, diction: 70, stagePresence: 88 },
    metrics: { fanCount: 2500000, youtubeViews: 450000000, spotifyStreams: 120000000, mediaMentions: 55000, socialBuzz: 84, buzzGrowthPercent: 180, webVotes: 540 }
  }
];

async function seed() {
  await connectDb();
  const ids = [];
  for (const item of data) {
    const doc = await Artist.findOneAndUpdate({ stageName: item.stageName }, item, { upsert: true, new: true, setDefaultsOnInsert: true });
    ids.push(doc._id);
  }

  const startAt = new Date();
  const endAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
  await BattleEvent.findOneAndUpdate(
    { slug: 'dien-vien-duoc-yeu-thich-thang-nay' },
    {
      title: 'Diễn viên được yêu thích nhất tháng',
      description: 'Fandom chiến thắng giúp nghệ sĩ được treo banner trang chủ.',
      slug: 'dien-vien-duoc-yeu-thich-thang-nay',
      artistIds: ids.slice(3, 5),
      startAt,
      endAt,
      status: 'active',
      voteMultiplier: 2,
      scoreWeights: { fanVote: 2, achievement: 1, buzz: 1, expert: 1 }
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  console.log(`[seed] upserted ${data.length} artists and 1 battle event`);
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
