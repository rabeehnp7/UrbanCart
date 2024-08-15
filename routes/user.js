var express = require('express');
var router = express.Router();
var productHelpers=require('../Helpers/product-helper')
var userHelpers=require('../Helpers/user-helper');
const checkLogin=(req,res,next)=>{
if(req.session.loggedIn){
  next()
}else{
  res.redirect('/login')
}
}

/* GET home page. */
router.get('/',checkLogin,async function(req, res, next) {
  let user=req.session.user
  let cartCount=await userHelpers.cartCount(user._id)
  productHelpers.viewProducts().then((products)=>{
    res.render('index', { products,user,cartCount});
  })
});
router.get('/login',async(req,res)=>{
  const isLoggedIn=await req.session.loggedIn
  if(isLoggedIn){
    res.redirect('/')
  }else{
    res.render('user/login',{"loginErr":req.session.loginErr})
    req.session.loginErr=false
  }
})
router.get('/signup',(req,res)=>{
  res.render('user/signup')
})
router.post('/signup',(req,res)=>{
  userHelpers.doSignup(req.body).then((data)=>{
    res.redirect('/login')
  })
})
router.post('/login',(req,res)=>{
  userHelpers.doLogin(req.body).then((response)=>{
    if(response.status){
      req.session.loggedIn=true
      req.session.user=response.user
      res.redirect('/')
    }else{
      req.session.user=null
      req.session.loginErr=true
      res.redirect('/login')
    }
  })
})
router.get('/logout',(req,res)=>{
  req.session.user=null
  req.session.loggedIn=false
  res.redirect('/')
})
router.get('/cart',checkLogin,(req,res)=>{
  productHelpers.viewCart(req.session.user._id).then((cartItems)=>{
    res.render('user/cart',{products:cartItems.products,user:req.session.user,grandTotal:cartItems.grandTotal})
  })
})
router.get('/add-to-cart/:id',checkLogin,(req,res)=>{
  productHelpers.addToCart(req.params.id,req.session.user._id).then(()=>{
    res.json({status:true})
    res.redirect('/')
  })
})
router.post('/update-quantity',(req,res)=>{
  userHelpers.updateQuantity(req.body).then(()=>{
    res.json({status:true})
  })
})
router.post('/delete-item',(req,res)=>{
  userHelpers.deleteItem(req.body).then((response)=>{
    res.json(response)
  })
})
router.get('/place-order',checkLogin,(req,res)=>{
  userHelpers.subTotal(req.session.user._id).then((total)=>{
    res.render('user/place-order',{grandTotal:total,user:req.session.user})
  })
})
router.post('/place-order',checkLogin,async(req,res)=>{
  let total=await userHelpers.subTotal(req.body.user)
    userHelpers.checkOut(req.body,req.body.user,total).then((orderId)=>{
      if(req.body.paymentMethod==='COD'){
        res.json({cod_success:true})
      }else if(req.body.paymentMethod==='Razorpay'){
        userHelpers.generateRazorpay(orderId,total).then((order)=>{
          res.json({cod_success:false,order})
        })
      }
    })
})
router.get('/order-success',(req,res)=>{
  res.render('user/order-success')
})
router.get('/orders',checkLogin,(req,res)=>{
  userHelpers.getOrders(req.session.user._id).then((orderList)=>{
    res.render('user/orders',{products:orderList.products,status:orderList.status,total:orderList.grandTotal,date:orderList.date})
  })
})
router.post('/verify-payment',(req,res)=>{
  userHelpers.verifyPayment(req.body).then((response)=>{
    res.json(response.payment)
  }).catch((err)=>{
    res.json(err)
  })
})
module.exports = router;
//₹
