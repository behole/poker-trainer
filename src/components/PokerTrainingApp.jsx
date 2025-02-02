          </div>
        </div>
      </div>

      {/* Training Tools */}
      <div className="p-4 bg-gray-800">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Training Tools</h3>
          <button className="p-2 bg-blue-600 rounded">
            <Settings className="w-4 h-4" />
          </button>
        </div>
        
        <div className="grid grid-cols-3 gap-4">
          {activeTools.map(tool => (
            <div key={tool} className="p-4 bg-gray-700 rounded">
              {tool.charAt(0).toUpperCase() + tool.slice(1)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PokerTrainingApp;