import Header from "@/components/Header";

export default function Home() {
  return (
    <div className="home w-screen containe-bg-v">
      <Header />
      <main className="px-8">
        <div className="relative w-full h-[500px] p-8 bg-black flex items-center justify-center">
            <img src="https://gips1.baidu.com/it/u=112193661,2737838585&fm=3074&app=3074&f=PNG?w=2560&h=1440" alt="" className="h-full w-full absolute inset-0 z-0" />
          <div className="w-1/2 z-1">
            <h3 className="text-6xl! text-white/80 font-bold">
              Make it with Dream Machine
            </h3>
            <p className="text-white/60">
              Production-ready images and videos with precision, speed, and
              control
            </p>
          </div>
        </div>
        <div className="py-8 px-8">
          <h3 className="text-2xl! font-bold text-green-800">Features</h3>
          <div className="grid grid-cols-3 gap-8 mt-8">
            <div className="card-bg p-8 rounded-md shadow-md">
              <h4 className="text-2xl font-bold text-gray-400">Feature 1</h4>
              <p className="text-gray-500">
                hello , this is the first feature, you can use it to do....
              </p>
            </div>
            <div className="card-bg p-8 rounded-md shadow-md">
              <h4 className="text-2xl font-bold text-gray-400">Feature 2</h4>
              <p className="text-gray-500">
                hello , this is the second feature, you can use it to do....
              </p>
            </div>
            <div className="card-bg p-8 rounded-md shadow-md">
              <h4 className="text-2xl font-bold text-gray-400">Feature 3</h4>
              <p className="text-gray-500">
                hello , this is the 3rd feature, you can use it to do....
              </p>
            </div>
          </div>
        </div>
      </main>
      <footer className="bg-black -mt-2">
        <div className="container mx-auto py-8 text-center">
          <p className="text-gray-700">
            &copy; 2025 My Website. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
