// frontend/src/pages/PublicProfile.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom'; // Adicionado useLocation
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import FollowButton from '../components/FollowButton';
import UserActionMenu from '../components/UserActionMenu';
import LoadingScreen from './LoadingScreen';
import ConnectionsModal from '../components/ConnectionsModal';
import PostCard from '../components/PostCard';
import CommentModal from '../components/CommentModal';
import MediaLightbox from '../components/MediaLightbox';

const getId = (v) => {
  if (v == null) return null;
  if (typeof v === 'number' || typeof v === 'string') return String(v);
  if (typeof v === 'object') {
    if (v.id != null) return String(v.id);
    if (v.user_id != null) return String(v.user_id);
    if (v.user != null) return getId(v.user);
    if (v.pk != null) return String(v.pk);
  }
  return null;
};

const PublicProfile = () => {
  const { id } = useParams(); // this is Profile UUID
  const navigate = useNavigate();
  const location = useLocation(); // Adicionado para ler a URL
  const { user: currentUser } = useAuth();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [activeTab, setActiveTab] = useState('all');
  const [connModal, setConnModal] = useState({ open: false, tab: 'followers' });

  // Estado para o post vindo da notificação
  const [highlightedPostId, setHighlightedPostId] = useState(null);

  // Lightbox State
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);

  // Comment modal state
  const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);
  const [activeCommentPost, setActiveCommentPost] = useState(null);

  const currentUserId = useMemo(() => {
    return getId(currentUser?.user_id || currentUser?.id || currentUser?.user);
  }, [currentUser]);

  const isOwner = useMemo(() => {
    if (!currentUser || !id) return false;
    const loggedInId = getId(currentUser.id || currentUser.profile_id);
    return loggedInId === id;
  }, [currentUser, id]);

  // Captura o ID do post da URL (?post=7)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const postId = params.get('post');
    if (postId) {
      setHighlightedPostId(String(postId));
    }
  }, [location]);

  // Reordena os posts para colocar o alvo da notificação no TOPO
  const sortedPosts = useMemo(() => {
    const allPosts = profile?.posts || [];
    if (!highlightedPostId) return allPosts;

    const target = allPosts.find(p => String(p.id) === highlightedPostId);
    if (!target) return allPosts;

    const others = allPosts.filter(p => String(p.id) !== highlightedPostId);
    return [target, ...others];
  }, [profile?.posts, highlightedPostId]);

  // Função para limpar o destaque (marcar como lido)
  const clearHighlight = () => {
    setHighlightedPostId(null);
    // Limpa a URL para o post não voltar ao topo no refresh
    navigate(location.pathname, { replace: true });
  };

  const fetchProfile = async () => {
    const minWait = new Promise((resolve) => setTimeout(resolve, 800));
    try {
      setLoading(true);
      setError(null);
      const [response] = await Promise.all([api.get(`/accounts/profiles/${id}/`), minWait]);
      setProfile(response.data);
    } catch (err) {
      setError(err?.response?.status === 404 ? 'User not found' : 'Error loading profile');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchProfile();
  }, [id]);

  const handlePostUpdate = (postIdOrUpdatedPost, isLiked, likesCount) => {
    setProfile((prev) => {
      if (!prev) return prev;
      if (typeof postIdOrUpdatedPost === 'object' && postIdOrUpdatedPost?.id != null) {
        const updatedPost = postIdOrUpdatedPost;
        return {
          ...prev,
          posts: (prev.posts || []).map((p) => (p.id === updatedPost.id ? updatedPost : p)),
        };
      }
      return {
        ...prev,
        posts: (prev.posts || []).map((p) =>
          p.id === postIdOrUpdatedPost ? { ...p, is_liked: isLiked, likes_count: likesCount } : p
        ),
      };
    });
  };

  const handlePostDelete = (postId) => {
    setProfile((prev) => {
      if (!prev) return prev;
      return { ...prev, posts: (prev.posts || []).filter((p) => p.id !== postId) };
    });
  };

  // Media Filters
  const photos = useMemo(() => 
    profile?.posts?.filter(
      (p) => p.media_url && !/\.(mp4|webm|mov|mkv|avi)$/i.test(p.media_url) && p.moderation_status !== 'REJECTED'
    ) || [], [profile]);

  const videos = useMemo(() => 
    profile?.posts?.filter(
      (p) => p.media_url && /\.(mp4|webm|mov|mkv|avi)$/i.test(p.media_url) && p.moderation_status !== 'REJECTED'
    ) || [], [profile]);

  const currentMediaList = useMemo(() => {
    return activeTab === 'photos' ? photos : videos;
  }, [activeTab, photos, videos]);

  const openLightbox = (index) => {
    setCurrentMediaIndex(index);
    setIsLightboxOpen(true);
  };

  if (loading) return <LoadingScreen />;
  if (error)
    return (
      <div className="min-h-screen bg-[#0F1419] text-white flex items-center justify-center font-bold">
        {error}
      </div>
    );

  return (
    <div className="min-h-screen bg-[#0F1419] text-white flex justify-center p-4">
      <div className="w-full max-w-xl bg-black border border-gray-800 rounded-2xl overflow-hidden h-fit shadow-2xl">
        <div className="h-32 bg-gray-900"></div>

        <div className="p-6 relative border-b border-gray-800">
          <div className="absolute -top-12 left-6">
            <img
              src={profile?.profile_picture}
              className="w-24 h-24 rounded-full border-4 border-black bg-black object-cover"
              alt=""
            />
          </div>

          <div className="flex justify-end items-center gap-2 mb-2">
            {isOwner ? (
              <button
                onClick={() => navigate('/settings')}
                className="px-4 py-1.5 rounded-full border border-gray-600 text-white font-bold text-[15px] hover:bg-white/10 transition"
                type="button"
              >
                Edit Profile
              </button>
            ) : (
              <>
                {profile && currentUser && (
                  <UserActionMenu
                    targetProfile={profile}
                    currentUserId={currentUserId}
                    onActionComplete={() => {}}
                  />
                )}
                {profile && currentUser && (
                  <FollowButton profileId={profile.id} initialIsFollowing={profile.is_following} />
                )}
              </>
            )}
          </div>

          <div className="mt-14">
            <h1 className="text-xl font-extrabold">{profile?.display_name || profile?.username}</h1>
            <p className="text-gray-500">@{profile?.username}</p>
          </div>
          <p className="mt-4 text-gray-200 whitespace-pre-wrap">{profile?.bio || 'No bio yet.'}</p>

          <div className="mt-4 flex gap-5 text-[15px]">
            <div onClick={() => setConnModal({ open: true, tab: 'following' })} className="flex gap-1 hover:underline cursor-pointer">
              <span className="font-bold text-white">{profile?.following_count || 0}</span>
              <span className="text-gray-500">Following</span>
            </div>
            <div onClick={() => setConnModal({ open: true, tab: 'followers' })} className="flex gap-1 hover:underline cursor-pointer">
              <span className="font-bold text-white">{profile?.followers_count || 0}</span>
              <span className="text-gray-500">Followers</span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-800 sticky top-0 bg-black/80 backdrop-blur-md z-10">
          {['all', 'photos', 'videos'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="flex-1 py-4 hover:bg-white/5 transition relative capitalize"
              type="button"
            >
              <span className={`text-sm font-bold ${activeTab === tab ? 'text-white' : 'text-gray-500'}`}>
                {tab === 'all' ? 'Posts' : tab}
              </span>
              {activeTab === tab && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-[#1D9BF0] rounded-full" />
              )}
            </button>
          ))}
        </div>

        <div>
          {profile?.is_restricted ? (
            <div className="flex flex-col items-center justify-center p-12 text-center text-gray-500">
              <h2 className="text-xl font-bold text-white">These posts are protected</h2>
              <p className="text-sm mt-2">Follow @{profile?.username} to see their posts.</p>
            </div>
          ) : (
            <div className="min-h-[300px]">
              {activeTab === 'all' && (
                <div className="divide-y divide-gray-800">
                  {sortedPosts.length > 0 ? (
                    sortedPosts.map((post) => {
                      const isTarget = String(post.id) === highlightedPostId;
                      return (
                        <div 
                          key={post.id}
                          onClickCapture={isTarget ? clearHighlight : undefined}
                          className={`transition-all duration-700 ease-in-out ${
                            isTarget 
                              ? 'bg-blue-500/10 border-l-4 border-blue-500' 
                              : 'bg-transparent border-l-4 border-transparent'
                          }`}
                        >
                          <PostCard
                            post={post}
                            currentUser={currentUser}
                            onPostUpdate={handlePostUpdate}
                            onLikeUpdate={handlePostUpdate}
                            onDeleteSuccess={handlePostDelete}
                            onCommentClick={() => {
                              setActiveCommentPost(post);
                              setIsCommentModalOpen(true);
                            }}
                          />
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-20 text-center text-gray-500">No posts yet.</div>
                  )}
                </div>
              )}

              {activeTab !== 'all' && (
                <div className="grid grid-cols-3 gap-1 p-1">
                  {currentMediaList.length > 0 ? (
                    currentMediaList.map((post, index) => {
                      const isPending = post.moderation_status === 'PENDING';
                      const isVideo = /\.(mp4|webm|mov|mkv|avi)$/i.test(post.media_url);
                      return (
                        <div 
                          key={post.id} 
                          onClick={() => !isPending && openLightbox(index)}
                          className="relative aspect-square bg-gray-900 overflow-hidden group cursor-pointer border border-transparent hover:border-gray-700 transition"
                        >
                          {isVideo ? (
                            <video src={post.media_url} className={`w-full h-full object-cover ${isPending ? 'blur-2xl opacity-30' : ''}`} />
                          ) : (
                            <img src={post.media_url} className={`w-full h-full object-cover ${isPending ? 'blur-2xl opacity-30' : ''}`} alt="" />
                          )}
                          
                          {isVideo && !isPending && (
                            <div className="absolute bottom-2 right-2 bg-black/50 p-1 rounded backdrop-blur-sm">
                               <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white"><path d="M21 12l-18 12v-24z"/></svg>
                            </div>
                          )}

                          {isPending && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                              <span className="text-[9px] bg-[#1D9BF0] text-white font-bold px-1.5 py-0.5 rounded uppercase">Review</span>
                            </div>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <div className="col-span-3 p-20 text-center text-gray-500">No {activeTab} found.</div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <ConnectionsModal
        isOpen={connModal.open}
        onClose={() => setConnModal({ ...connModal, open: false })}
        profileId={profile?.id}
        initialTab={connModal.tab}
      />

      {isCommentModalOpen && activeCommentPost && (
        <CommentModal
          post={activeCommentPost}
          isOpen={isCommentModalOpen}
          onClose={() => {
            setIsCommentModalOpen(false);
            setActiveCommentPost(null);
          }}
        />
      )}

      {/* Media Lightbox Component */}
      <MediaLightbox 
        isOpen={isLightboxOpen}
        mediaList={currentMediaList}
        currentIndex={currentMediaIndex}
        onClose={() => setIsLightboxOpen(false)}
        onPrev={() => setCurrentMediaIndex(prev => prev - 1)}
        onNext={() => setCurrentMediaIndex(prev => prev + 1)}
      />
    </div>
  );
};

export default PublicProfile;