const db=require('../db')
const Promise=require('promise');
var ObjectId = require('mongodb').ObjectId;

module.exports={
    addProduct:(product,callback)=>{
        db.get().collection('products').insertOne(product).then((data)=>{
            callback(data.insertedId)
        })
    },
    viewProducts:()=>{
        return new Promise(async(resolve,reject)=>{
            const result=await db.get().collection('products').find().toArray()
            resolve(result)
        })
    },
    deleteProduct:(proId)=>{
        return new Promise((resolve,reject)=>{
            db.get().collection('products').deleteOne({_id:new ObjectId(proId)}).then(()=>{
                resolve()
            })
        })
    },
    getProduct:(proId)=>{
        return new Promise((resolve,reject)=>{
            db.get().collection('products').findOne({_id:new ObjectId(proId)}).then((product)=>{
                resolve(product)
            })
        })
    },
    editProduct:(proId,prodDoc)=>{
        return new Promise((resolve,reject)=>{
            db.get().collection('products').updateOne({_id:new ObjectId(proId)},{
                $set:{
                    productName:prodDoc.productName,
                    category:prodDoc.category,
                    description:prodDoc.description,
                    price:prodDoc.price
                }
            }).then((response)=>{
                console.log(response)
                resolve()
        })
        })
    },
    addToCart:(proId,userId)=>{
        return new Promise(async(resolve,reject)=>{
            let userCart=await db.get().collection('cart').findOne({user:new ObjectId(userId)})
            if(userCart){
                const product=await userCart.products.filter(product=>product.proId===proId)
                if(product.length > 0){
                    db.get().collection('cart').updateOne({user:new ObjectId(userId),"products.proId": proId },{
                        $inc:{
                            "products.$.quantity":1
                        }
                    })
                    resolve()
                }else{
                    db.get().collection('cart').updateOne({user:new ObjectId(userId)},{
                        $push:{
                            'products':
                            {proId,
                            'quantity':1}
                        }
                    }).then(()=>{
                        resolve()
                    })
                }
            }else{
                let cartObj={
                    user:new ObjectId(userId),
                    products:[{
                        proId,
                        'quantity':1

                    }]
                }
                db.get().collection('cart').insertOne(cartObj).then(()=>{
                    resolve()
                })
            }
        })
    },
    viewCart: (userId) => {
        return new Promise((resolve, reject) => {
            db.get().collection('cart').aggregate([
                {
                    $match: { user: new ObjectId(userId) }
                },
                {
                    $unwind: "$products"
                },
                {
                    $addFields: {
                        proId: { $toObjectId: "$products.proId" },
                        quantity: "$products.quantity"
                    }
                },
                {
                    $lookup: {
                        from: 'products',
                        localField: 'proId',
                        foreignField: '_id',
                        as: 'productDetails'
                    }
                },
                {
                    $unwind: "$productDetails"
                },
                {
                    $addFields: {
                        productPrice: { $toDouble: "$productDetails.price" }, // Convert price to double
                        totalPrice: { $multiply: [{ $toDouble: "$productDetails.price" }, "$quantity"] } // Calculate total price
                    }
                },
                {
                    $group: {
                        _id: "$_id",
                        products: {
                            $push: {
                                cartId: "$_id",
                                proId: "$productDetails._id",
                                productName: "$productDetails.productName",
                                category: "$productDetails.category",
                                description: "$productDetails.description",
                                price: "$productPrice", // Use the converted price
                                quantity: "$quantity",
                                totalPrice: "$totalPrice"
                            }
                        },
                        grandTotal: { $sum: "$totalPrice" } // Sum up all total prices to calculate grand total
                    }
                }
            ]).toArray()
            .then((cartItems) => {
                resolve(cartItems[0] || { products: [], grandTotal: 0 }); // Resolve with the 'products' array and 'grandTotal', or an empty array and 0 if not found
            })
            .catch((err) => {
                console.error('Error in aggregation pipeline:', err); // Log the error for debugging
                reject(err);
            });
        });
    }
}