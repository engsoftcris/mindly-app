const LoadingScreen = () => (
  <div className="min-h-screen bg-black flex flex-col items-center justify-center">
    {/* Logo ou Nome do App com pulsação */}
    <h1 className="text-white text-4xl font-black tracking-tighter animate-pulse mb-4">
      Mindly
    </h1>
    {/* Spinner Spinner */}
    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
  </div>
);

export default LoadingScreen;