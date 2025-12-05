import Header from "@/components/Header";

export default function Home() {
  return (
    <div className="home w-screen bg-sky-100">
      <Header />
      <main>
        <div className="relative w-full h-[500px] p-8 bg-black flex items-center justify-center">
            <img src="https://gips1.baidu.com/it/u=112193661,2737838585&fm=3074&app=3074&f=PNG?w=2560&h=1440" alt="" className="h-full w-full absolute inset-0 z-0" />
          <div className="w-1/2 z-1">
            <h3 className="text-6xl text-white/80 font-bold">
              Make it with Dream Machine
            </h3>
            <p className="text-white/60">
              Production-ready images and videos with precision, speed, and
              control
            </p>
          </div>
        </div>
        <div className="p-8">
          <h3 className="text-4xl font-bold">Features</h3>
          <div className="grid grid-cols-3 gap-8 mt-8">
            <div className="bg-white p-8 rounded-md shadow-md">
              <h4 className="text-2xl font-bold">Feature 1</h4>
              <p className="text-gray-600">
                hello , this is the first feature, you can use it to do....
              </p>
            </div>
            <div className="bg-white p-8 rounded-md shadow-md">
              <h4 className="text-2xl font-bold">Feature 2</h4>
              <p className="text-gray-600">
                hello , this is the second feature, you can use it to do....
              </p>
            </div>
            <div className="bg-white p-8 rounded-md shadow-md">
              <h4 className="text-2xl font-bold">Feature 3</h4>
              <p className="text-gray-600">
                hello , this is the 3rd feature, you can use it to do....
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
