const samples = [
  {
    type: 'youtube_listen',
    title: 'Nghe một bản hit trên YouTube',
    description: 'Mở link, nghe ít nhất 45 giây, sau đó ghi lại tên bài hoặc cảm nhận ngắn.',
    targetUrl: 'https://www.youtube.com/results?search_query=nhac+viet+hit',
    minimumSeconds: 45,
    rewardGold: 30
  },
  {
    type: 'actor_watch',
    title: 'Xem trích đoạn diễn xuất',
    description: 'Tìm một trích đoạn phim Việt Nam, xem ít nhất 45 giây và ghi lại tên diễn viên bạn xem.',
    targetUrl: 'https://www.youtube.com/results?search_query=trich+doan+phim+viet+nam+dien+vien',
    minimumSeconds: 45,
    rewardGold: 30
  },
  {
    type: 'artist_info',
    title: 'Tìm hiểu thông tin nghệ sĩ',
    description: 'Đọc/tìm hiểu thông tin về một ca sĩ hoặc diễn viên Việt Nam, sau đó viết 1 câu bạn biết thêm.',
    targetUrl: 'https://www.google.com/search?q=ca+s%C4%A9+di%E1%BB%85n+vi%C3%AAn+Vi%E1%BB%87t+Nam',
    minimumSeconds: 30,
    rewardGold: 25
  },
  {
    type: 'read_news',
    title: 'Đọc một tin giải trí',
    description: 'Đọc một tin về nhạc/phim Việt và ghi lại 1 ý chính để hệ thống chống nhiệm vụ ảo.',
    targetUrl: 'https://www.google.com/search?q=tin+gi%E1%BA%A3i+tr%C3%AD+Vi%E1%BB%87t+Nam',
    minimumSeconds: 35,
    rewardGold: 25
  },
  {
    type: 'share_rank',
    title: 'Tạo thẻ kêu gọi vote',
    description: 'Dùng chức năng Generate Card trên web, ghi lại tên nghệ sĩ bạn muốn kêu gọi bình chọn.',
    targetUrl: '',
    minimumSeconds: 20,
    rewardGold: 20
  },
  {
    type: 'quiz',
    title: 'Mini quiz fandom',
    description: 'Tìm hiểu 1 tác phẩm nổi bật của nghệ sĩ Việt và ghi lại tên tác phẩm cùng năm phát hành nếu biết.',
    targetUrl: 'https://www.google.com/search?q=MV+phim+Vi%E1%BB%87t+Nam+n%E1%BB%95i+b%E1%BA%ADt',
    minimumSeconds: 30,
    rewardGold: 25
  }
];

function taskDateKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function randomTask() {
  const index = Math.floor(Math.random() * samples.length);
  return samples[index];
}

module.exports = { randomTask, taskDateKey };
