import { create } from 'zustand';

const useRelationshipStore = create((set) => ({
  following: [],
  followers: [],
  blockedUsers: [],

  setInitialData: (data) =>
    set({
      following: (data.following || []).map((id) => String(id)),
      followers: (data.followers || []).map((id) => String(id)),
      blockedUsers: (data.blockedUsers || []).map((id) => String(id)),
    }),

  follow: (userId) =>
    set((state) => ({
      following: state.following.includes(userId)
        ? state.following
        : [...state.following, userId],
    })),

  unfollow: (userId) =>
    set((state) => ({
      following: state.following.filter((id) => id !== userId),
    })),

  block: (userId) =>
    set((state) => ({
      blockedUsers: state.blockedUsers.includes(userId)
        ? state.blockedUsers
        : [...state.blockedUsers, userId],
      following: state.following.filter((id) => id !== userId),
    })),
}));

export default useRelationshipStore;
