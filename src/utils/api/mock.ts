import apiClient from "./client";
import { User, GameStats } from "@/utils/types";

interface MockDataResponse {
  user: User;
  gameStats: GameStats;
}

interface MockFriendsResponse {
  friends: any[];
}

interface MockTasksResponse {
  game_tasks: any[];
  daily_reward: number[];
  game_reward: number;
  completed: number;
  renaissance_tasks: any[];
  total_days_checked_in: number;
  can_check_in_today: boolean;
}

interface MockSearchResultsResponse {
  searchResults: any[];
}

interface MockFriendRequestsResponse {
  friendRequests: any[];
}

export const fetchMockData = async (): Promise<MockDataResponse> => {
  const res = await apiClient.get<MockDataResponse>('/api/mock/data');
  return res.data;
};

export const fetchMockFriends = async (): Promise<any[]> => {
  const res = await apiClient.get<MockFriendsResponse>('/api/mock/friends');
  return res.data.friends;
};

export const fetchMockTasks = async (): Promise<MockTasksResponse> => {
  const res = await apiClient.get<MockTasksResponse>('/api/mock/tasks');
  return res.data;
};

export const fetchMockSearchResults = async (): Promise<any[]> => {
  const res = await apiClient.get<MockSearchResultsResponse>('/api/mock/search');
  return res.data.searchResults;
};

export const fetchMockFriendRequests = async (): Promise<any[]> => {
  const res = await apiClient.get<MockFriendRequestsResponse>('/api/mock/requests');
  return res.data.friendRequests;
};

export const fetchMockFriendInfo = async (): Promise<any> => {
  const res = await apiClient.get('/api/mock/friend-info');
  return res.data;
};

export const fetchMockAirdrop = async (): Promise<any> => {
  const res = await apiClient.get('/api/mock/airdrop');
  return res.data;
};

export const fetchMockRecords = async (): Promise<any[]> => {
  const res = await apiClient.get<any[]>('/api/mock/records');
  return res.data;
};

export const fetchMockLeaderboard = async (): Promise<any> => {
  const res = await apiClient.get('/api/mock/leaderboard');
  return res.data;
};

export const fetchMockInvites = async (): Promise<any[]> => {
  const res = await apiClient.get<any[]>('/api/mock/invites');
  return res.data;
};

export const fetchMockRaffles = async (): Promise<any[]> => {
  const res = await apiClient.get<any[]>('/api/mock/raffles');
  return res.data;
};
