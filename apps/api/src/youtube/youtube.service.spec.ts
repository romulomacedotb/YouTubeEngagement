import { YouTubeService } from './youtube.service';

describe('YouTubeService', () => {
  let youtubeService: YouTubeService;

  beforeEach(() => {
    youtubeService = new YouTubeService();
  });

  it('should return mock subscribers with valid properties for development and testing', () => {
    const mockList = youtubeService.getMockSubscribers();
    expect(mockList.length).toBeGreaterThan(0);
    expect(mockList[0]).toHaveProperty('youtubeChannelId');
    expect(mockList[0]).toHaveProperty('title');
    expect(mockList[0]).toHaveProperty('subscriberCount');
    expect(mockList[0].youtubeChannelId).toMatch(/^UC_/);
  });

  it('should calculate uploads playlist ID properly by replacing UC with UU', () => {
    expect(youtubeService.getUploadsPlaylistId('UC1234567890abcdef')).toBe('UU1234567890abcdef');
    expect(youtubeService.getUploadsPlaylistId('OTHER_PLAYLIST')).toBe('OTHER_PLAYLIST');
  });

  it('should return mock latest video with valid URL and video ID', () => {
    const video = youtubeService.getMockLatestVideo('UC_DEV_TECH_001');
    expect(video).toBeDefined();
    expect(video.youtubeVideoId).toBe('yt_vid_tech_001');
    expect(video.url).toContain('youtube.com/watch?v=');
  });
});
