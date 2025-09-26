'use client';

import { motion } from 'framer-motion';

const TrustedByCarousel = () => {
  // Real creator data from Revu customers - YouTube and Instagram versions
  const trustedBy = [
    { name: "Chelsea Fan TV", handle: "@ChelseaFanTV", followers: "487K", platform: "YouTube", avatar: "CF", growth: 32 },
    { name: "Chelsea Fan TV", handle: "@chelseafantv", followers: "245K", platform: "Instagram", avatar: "CF", growth: 28 },
    { name: "Louis Skupien", handle: "@louisskupien", followers: "312K", platform: "YouTube", avatar: "LS", growth: 41 },
    { name: "Louis Skupien", handle: "@louisskupien", followers: "156K", platform: "Instagram", avatar: "LS", growth: 35 },
    { name: "Top Notch Gyms", handle: "@topnotchgyms", followers: "98K", platform: "YouTube", avatar: "TN", growth: 24 },
    { name: "Top Notch Gyms", handle: "@topnotchgyms", followers: "67K", platform: "Instagram", avatar: "TN", growth: 19 },
    { name: "Amavoy", handle: "@DrinkAmavoy", followers: "45K", platform: "YouTube", avatar: "AM", growth: 37 },
    { name: "Amavoy", handle: "@drinkamavoy", followers: "28K", platform: "Instagram", avatar: "AM", growth: 22 }
  ];

  // Create extended array for seamless loop
  const extendedTrustedBy = [...trustedBy, ...trustedBy];

  const getPlatformColor = (platform: string) => {
    return platform === 'Instagram' ? 'bg-pink-500' : 'bg-red-500';
  };

  const getPlatformIcon = (platform: string) => {
    if (platform === 'Instagram') {
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.070-4.85.070-3.204 0-3.584-.012-4.849-.070-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.40z"/>
        </svg>
      );
    } else {
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
        </svg>
      );
    }
  };

  return (
    <div className="w-full py-8">
      <motion.div
        className="text-center mb-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <h3 className="text-2xl lg:text-3xl font-bold text-slate-900 mb-2">
          Trusted by <span className="text-green-600">10,000+</span> Creators
        </h3>
        <p className="text-slate-600 text-lg">
          Join successful creators who are already scaling their engagement
        </p>
      </motion.div>

      <div className="relative overflow-hidden">
        <motion.div
          className="flex gap-6"
          animate={{
            x: [0, -(trustedBy.length * 280)]
          }}
          transition={{
            duration: trustedBy.length * 3,
            repeat: Infinity,
            ease: "linear",
            repeatType: "loop"
          }}
        >
          {extendedTrustedBy.map((creator, index) => (
            <motion.div
              key={`${creator.handle}-${index}`}
              className="flex-shrink-0 w-64 bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-slate-200/70 hover:shadow-xl transition-all duration-300"
              whileHover={{ 
                scale: 1.02,
                y: -2
              }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ 
                duration: 0.5, 
                delay: index * 0.1,
                type: "spring",
                stiffness: 100
              }}
            >
              <div className="flex items-center space-x-4 mb-4">
                <div className="relative">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg">
                    {creator.avatar}
                  </div>
                  <div className={`absolute -bottom-1 -right-1 w-6 h-6 ${getPlatformColor(creator.platform)} rounded-full flex items-center justify-center text-white shadow-md`}>
                    {getPlatformIcon(creator.platform)}
                  </div>
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-slate-900 text-lg leading-tight">
                    {creator.name}
                  </h4>
                  <p className="text-slate-600 text-sm">
                    {creator.handle}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between mb-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {creator.followers}
                  </div>
                  <div className="text-xs text-slate-500 uppercase tracking-wide">
                    Followers
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    +{creator.growth}%
                  </div>
                  <div className="text-xs text-slate-500 uppercase tracking-wide">
                    Growth
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-1 text-yellow-500">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                  </svg>
                ))}
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>

      <motion.div
        className="text-center mt-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.5 }}
      >
        <div className="flex flex-wrap justify-center gap-4 text-sm text-slate-600">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span>Average 25% engagement increase</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <span>Save 10+ hours per week</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
            <span>Trusted across 50+ countries</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default TrustedByCarousel;
