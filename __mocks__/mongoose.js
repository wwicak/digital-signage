const mongoose = {
  connect: jest.fn(),
  connection: {
    close: jest.fn(),
  },
  Types: {
    ObjectId: jest.fn().mockImplementation((id) => id || "mock-object-id"),
  },
  Schema: jest.fn().mockImplementation(() => ({
    pre: jest.fn(),
    post: jest.fn(),
    virtual: jest.fn(),
    index: jest.fn(),
    plugin: jest.fn(),
    set: jest.fn(),
    get: jest.fn(),
  })),
  model: jest.fn().mockImplementation(() => ({
    create: jest.fn(),
    find: jest.fn(),
    findById: jest.fn(),
    findOne: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findByIdAndDelete: jest.fn(),
    updateMany: jest.fn(),
    deleteMany: jest.fn(),
    save: jest.fn(),
  })),
};

// Add Schema.Types to the Schema constructor
mongoose.Schema.Types = {
  ObjectId: "ObjectId",
  String: String,
  Number: Number,
  Date: Date,
  Boolean: Boolean,
  Array: Array,
  Mixed: "Mixed",
};

module.exports = mongoose;
