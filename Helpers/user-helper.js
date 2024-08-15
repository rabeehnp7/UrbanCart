const Promise=require('promise')
const db=require('../db')
const bcrypt=require('bcrypt');
var ObjectId = require('mongodb').ObjectId;
var Razorpay=require('razorpay')
var instance = new Razorpay({
    key_id: 'rzp_test_SQi1Znz85aOuLy',
    key_secret: 'CVyib74ECqvZHgslhVP9gtlO',
  });

module.exports={
    doSignup:(userData)=>{
        return new Promise(async(resolve,reject)=>{
             bcrypt.hash(userData.password,10,(err,hash)=>{
                userData.password=hash
                db.get().collection('users').insertOne(userData).then((data)=>{
                    resolve(data)
                })
             })
        })
    },
    doLogin:(userData)=>{
        return new Promise((resolve,reject)=>{
            let response={}
            db.get().collection('users').findOne({email:userData.email}).then((user)=>{
                if(user){
                    bcrypt.compare(userData.password,user.password,(err,userDoc)=>{
                        if(userDoc){
                            response.user=user
                            response.status=true
                            resolve(response)
                        }else{
                            resolve({status:false})
                        }
                    })
                }else{
                    resolve({status:false})
                }
            })
        })
    },
    cartCount:(userId)=>{
        return new Promise(async(resolve,reject)=>{
            let cart=await db.get().collection('cart').findOne({user:new ObjectId(userId)})
            if(cart){
                let productLength=cart['products'].length
                let quantity=0
                for(i=0;i<productLength;i++){
                    quantity+=cart.products[i].quantity
                }
                resolve(quantity)
            }else{
                resolve(0)
            }
        })
    },
    updateQuantity:(result)=>{
        result.count=parseInt(result.count)
        return new Promise((resolve,reject)=>{
            db.get().collection('cart').updateOne({_id:new ObjectId(result.cart),"products.proId":result.product},
        {$inc:{"products.$.quantity":result.count}}).then(()=>{ 
            resolve()
        })
        })
    },
    deleteItem:({cartId,proId})=>{
        return new Promise((resolve,reject)=>{
            db.get().collection('cart').updateOne(
                { '_id': new ObjectId(cartId) },
                {
                    $pull: {
                        products: {
                            proId: proId // Ensure proId is treated as a string
                        }
                    }
                }
            ).then(()=>{
                resolve({status:true})
            })
        })
    },
    subTotal:(userId)=>{
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
                        _id: null, // We don't need a specific _id for the group since we're only summing up prices
                        grandTotal: { $sum: "$totalPrice" } // Sum up all total prices to calculate grand total
                    }
                }
            ]).toArray()
            .then((result) => {
                resolve(result[0]?.grandTotal || 0); // Resolve with grandTotal or 0 if not found
            })
            .catch((err) => {
                console.error('Error in aggregation pipeline:', err); // Log the error for debugging
                reject(err);
            });
        });        
    },
    checkOut:(order,userId,total)=>{
        return new Promise(async(resolve,reject)=>{
            const cart=await db.get().collection('cart').findOne({user:new ObjectId(userId)})
            let  status=order.paymentMethod=='COD'?'placed':'pending'
            const orderDetails={
                userId:new ObjectId(userId),
                deliveryDetails:{
                    userName:order.userName,
                    address: order.address,
                    city: order.city,
                    state: order.state,
                    pincode: order.zip,
                    paymentMethod:order.paymentMethod
                },
                products:cart.products,
                status,
                grandTotal:total,
                date:new Date()
            }
            db.get().collection('orders').insertOne(orderDetails).then((response)=>{
                db.get().collection('cart').deleteOne({user:new ObjectId(userId)})
                resolve(response.insertedId)
            })
        })
    },
    getOrders:(userId)=> {
        return new Promise((resolve, reject) => {
            db.get().collection('orders').aggregate([
                { $match: { userId: new ObjectId(userId) } },
                { $unwind: "$products" },
                { 
                    $lookup: {
                        from: 'products',
                        let: { proId: { $toObjectId: "$products.proId" } },
                        pipeline: [
                            { $match: { $expr: { $eq: ["$_id", "$$proId"] } } }
                        ],
                        as: 'productDetails'
                    }
                },
                { $unwind: { path: "$productDetails", preserveNullAndEmptyArrays: true } },
                { 
                    $project: {
                        _id: 0,
                        product: {
                            proId: "$products.proId",
                            quantity: "$products.quantity",
                            productName: "$productDetails.productName",
                            category: "$productDetails.category",
                            description: "$productDetails.description",
                            price: "$productDetails.price"
                        },
                        status: 1,
                        grandTotal: 1,
                        date: 1
                    }
                },
                { 
                    $group: {
                        _id: {
                            status: "$status",
                            grandTotal: "$grandTotal",
                            date: "$date"
                        },
                        products: { $push: "$product" }
                    }
                },
                { 
                    $project: {
                        _id: 0,
                        status: "$_id.status",
                        grandTotal: "$_id.grandTotal",
                        date: "$_id.date",
                        products: 1
                    }
                }
            ]).toArray().then((orderDetails) => {
                resolve(orderDetails[0]);
            }).catch((error) => {
                reject(error);
            });
        });
    },
    generateRazorpay:(orderId,totalAmount)=>{
        const amountInPaise = Math.round(totalAmount * 100)
        const options = {
            amount: amountInPaise ,
            currency: "INR",
            receipt: ""+orderId,
            payment_capture: 1
        };
        return new Promise((resolve,reject)=>{
            instance.orders.create(options,function(err,order){
                resolve(order)
            })
        })
    },
    verifyPayment:(details)=>{
        return new Promise((resolve,reject)=>{
            const crypto = require('crypto')
            const hmac = crypto.createHmac('sha256', 'CVyib74ECqvZHgslhVP9gtlO');

        const data = details['payment[razorpay_order_id]'] + '|' + details['payment[razorpay_payment_id]'];        
        hmac.update(data);
        const digest = hmac.digest('hex');
        console.log(details['order[receipt]'])
            if(digest===details['payment[razorpay_signature]']){
                db.get().collection('orders').updateOne({_id:new ObjectId(details['order[receipt]'])},
            {
                $set:{
                    status:'placed'
                }
            })
                resolve({payment:'success'})
            }else{
                reject({payment:'failed'})
            }
        })
    }
}