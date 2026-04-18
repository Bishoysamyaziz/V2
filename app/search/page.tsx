'use client';

import { useState, useEffect } from 'react';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, getDocs, where } from 'firebase/firestore';
import Link from 'next/link';
import Image from 'next/image';

export default function SearchPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'experts' | 'users' | 'posts'>('all');
  const [results, setResults] = useState({ experts: [], users: [], posts: [] });
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setLoading(true);
    try {
      const expertsSnapshot = await getDocs(collection(db, 'experts'));
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const postsSnapshot = await getDocs(collection(db, 'posts'));

      const expertsData = expertsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const usersData = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const postsData = postsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      const queryLower = searchQuery.toLowerCase();

      const matchedExperts = expertsData.filter((exp: any) => 
        exp.title?.toLowerCase().includes(queryLower) || 
        exp.bio?.toLowerCase().includes(queryLower) ||
        exp.categories?.some((cat: string) => cat.toLowerCase().includes(queryLower))
      );

      const matchedUsers = usersData.filter((u: any) => 
        u.displayName?.toLowerCase().includes(queryLower) || 
        u.email?.toLowerCase().includes(queryLower)
      );

      const matchedPosts = postsData.filter((p: any) => 
        p.content?.toLowerCase().includes(queryLower)
      );

      // Map user data to experts
      const mappedExperts = matchedExperts.map((exp: any) => {
        const userData = usersData.find((u: any) => u.uid === exp.uid);
        return { ...exp, user: userData };
      });

      setResults({
        experts: mappedExperts as any,
        users: matchedUsers as any,
        posts: matchedPosts as any
      });
    } catch (error) {
      console.error("Error searching:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold  mb-6 ">البحث الشامل</h1>
        <form onSubmit={handleSearch} className="relative">
          
          <input
            type="text"
            placeholder="ابحث عن خبراء، مستخدمين، أو منشورات..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full  border  rounded-2xl pr-12 pl-4 py-4 text-lg  focus:outline-none focus: font-['Tajawal'] shadow-lg"
          />
          <button 
            type="submit"
            className="absolute left-2 top-1/2 -translate-y-1/2 px-6 py-2   font-bold rounded-xl hover:shadow-[0_0_15px_#00f2ff] transition-all font-['Tajawal']"
          >
            بحث
          </button>
        </form>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-4 mb-6 hide-scrollbar border-b ">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-6 py-2 rounded-full whitespace-nowrap font-medium transition-all font-['Tajawal'] ${
            activeTab === 'all' 
              ? '  shadow-[0_0_15px_rgba(0,242,255,0.3)]' 
              : '  hover:'
          }`}
        >
          الكل
        </button>
        <button
          onClick={() => setActiveTab('experts')}
          className={`px-6 py-2 rounded-full whitespace-nowrap font-medium transition-all font-['Tajawal'] ${
            activeTab === 'experts' 
              ? '  shadow-[0_0_15px_rgba(0,242,255,0.3)]' 
              : '  hover:'
          }`}
        >
          الخبراء ({results.experts.length})
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`px-6 py-2 rounded-full whitespace-nowrap font-medium transition-all font-['Tajawal'] ${
            activeTab === 'users' 
              ? '  shadow-[0_0_15px_rgba(0,242,255,0.3)]' 
              : '  hover:'
          }`}
        >
          المستخدمين ({results.users.length})
        </button>
        <button
          onClick={() => setActiveTab('posts')}
          className={`px-6 py-2 rounded-full whitespace-nowrap font-medium transition-all font-['Tajawal'] ${
            activeTab === 'posts' 
              ? '  shadow-[0_0_15px_rgba(0,242,255,0.3)]' 
              : '  hover:'
          }`}
        >
          المنشورات ({results.posts.length})
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="w-8 h-8 rounded-full  animate-bounce" /></div>
      ) : (
        <div className="space-y-8">
          {/* Experts Results */}
          {(activeTab === 'all' || activeTab === 'experts') && results.experts.length > 0 && (
            <div>
              <h2 className="text-xl font-bold  mb-4 font-['Tajawal'] flex items-center gap-2">
                
                الخبراء
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {results.experts.map((expert: any) => (
                  <Link href="/experts" key={expert.id}>
                    <div className=" border  rounded-2xl p-4 flex items-center gap-4 hover: transition-colors glass">
                      <div className="relative w-12 h-12 rounded-full overflow-hidden  flex-shrink-0">
                        {expert.user?.photoURL ? (
                          <Image fill alt={expert.user?.displayName || 'Expert'} src={expert.user.photoURL} className="object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center  font-bold">
                            {expert.user?.displayName?.[0] || '?'}
                          </div>
                        )}
                      </div>
                      <div>
                        <h3 className="font-bold  font-['Tajawal']">{expert.user?.displayName || 'مستخدم'}</h3>
                        <p className="text-sm  font-['Tajawal']">{expert.title}</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Users Results */}
          {(activeTab === 'all' || activeTab === 'users') && results.users.length > 0 && (
            <div>
              <h2 className="text-xl font-bold  mb-4 font-['Tajawal'] flex items-center gap-2">
                
                المستخدمين
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {results.users.map((u: any) => (
                  <div key={u.id} className=" border  rounded-2xl p-4 flex items-center gap-4 glass">
                    <div className="relative w-12 h-12 rounded-full overflow-hidden  flex-shrink-0">
                      {u.photoURL ? (
                        <Image fill alt={u.displayName || 'User'} src={u.photoURL} className="object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center  font-bold">
                          {u.displayName?.[0] || '?'}
                        </div>
                      )}
                    </div>
                    <div>
                      <h3 className="font-bold  font-['Tajawal']">{u.displayName || 'مستخدم'}</h3>
                      <p className="text-sm  font-['Tajawal']">{u.role === 'expert' ? 'خبير' : u.role === 'admin' ? 'مشرف' : 'مستخدم'}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Posts Results */}
          {(activeTab === 'all' || activeTab === 'posts') && results.posts.length > 0 && (
            <div>
              <h2 className="text-xl font-bold  mb-4 font-['Tajawal'] flex items-center gap-2">
                
                المنشورات
              </h2>
              <div className="space-y-4">
                {results.posts.map((post: any) => (
                  <div key={post.id} className=" border  rounded-2xl p-6 glass">
                    <p className=" font-['Tajawal'] line-clamp-3">{post.content}</p>
                    <span className="text-xs  mt-4 block ">
                      {new Date(post.createdAt).toLocaleString('ar-EG')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* No Results */}
          {!loading && searchQuery && results.experts.length === 0 && results.users.length === 0 && results.posts.length === 0 && (
            <div className="text-center py-20  border  rounded-2xl glass">
              
              <h3 className="text-xl font-medium  mb-2 font-['Tajawal']">لا توجد نتائج</h3>
              <p className=" font-['Tajawal']">لم نتمكن من العثور على أي نتائج تطابق &quot;{searchQuery}&quot;</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
