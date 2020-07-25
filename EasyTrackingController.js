//Códigos da codificação até a linha 250.... O Restante se trata de códigos complexos e do RS. 


const fs = require('fs');
const qrcode = require('qrcode-generator');
const crypto = require('crypto');
var execSync = require('child_process').execSync;


var id;
var y;
var k;
var n;
var t;
var b;


module.exports = {
    async easytrackingRender(req,res) {
        res.render(__dirname + '/easytracking');
    },
    async easytrackingPost(req,res,next){
        let qr_text = req.body.qr_text;  
        // Generate QR Code from text
        res.send(create_qrcode(qr_text));
    }
};

var create_qrcode = function(text) {
    var qr = qrcode(0, 'L');
    y = encode7BitsInfo(text);
    id = crypto.createHmac('sha256', 'easytracking')
    .update(text)
    .digest('hex');
    var redu = encode2BitsInfo(y);
    b = encode6BitsInfo(y,redu);
    var message = generateMessage(b,id,text);
    qr.addData(message,'Byte');
    qr.make();
    return qr.createSvgTag({ cellSize: 4, margin: 0, xscalable: true });
};

var encode7BitsInfo = function(text) {
    var bits = "";
    for (var i = 0; i < text.length; i++) {
        var c = text.charCodeAt(i);
        if(c<128) {
            var byte = c.toString(2);
            if (byte.length < 7)
                byte = addPadding(byte,7);
            bits = bits + byte;
        } else {
            return;
        }
    }

    //console.log(bits);
    //console.log(bits.length)
    if (bits.length % 8 != 0) {
        var padding = 8 - bits.length % 8;
        bits = bits + "0".repeat(padding);
    }
    //console.log(bits);
    //console.log(bits.length)
    y = bitsArray2Int(bits);
    return y;
    
    
};

var encode2BitsInfo = function(y) {
    var bits = "";
    for (var i = 0; i < y.length; i++) {
        var c = y[i];
        var byte = c.toString(2);
        byte = addPadding(byte,8);
        bits = bits + byte[0] + byte[1];
    }
    if (bits.length % 8 != 0) {
        var padding = 8 - bits.length % 8;
        bits = bits + "0".repeat(padding);
    }
    k = bitsArray2Int(bits);
    console.log(k);

    var redundancy = generateRedundancy(bits,k);
    var redu = bitsArray2Int(redundancy);
    console.log(redu);
    createRedundancyFile(redu,k);
    return redundancy;
};

var createRedundancyFile = function(byteArray,k){
    const buf = Buffer.from(byteArray);
    fs.writeFile('/var/www/html/red/'+ id + '.red', buf, (err) => {
        if (err) throw err;
        console.log('It\'s saved!');
    });
};

var generateRedundancy = function(bits,k){
    
    t = k.length;
    n = 3*k.length;
    var data = (function (s) { var a = []; while (s-- > 0)
        a.push(0); return a; })(n);
    for(var i=0;i<k.length;i++){
        data[i] = k[i];
    }
    var gf = new GenericGF(285, 256, 0);
    var encoder = new ReedSolomonEncoder(gf);
    encoder.encode(data, (n - t));
    var redundancyBits = "";
    for(i=t;i<n;i++){
        var c = data[i];
        var byte = c.toString(2);
        byte = addPadding(byte,8);
        redundancyBits = redundancyBits + byte;
    }   
    
    return redundancyBits;
};

var encode6BitsInfo = function(y,redu) {

    var bitsInfo = "";
    var bitsInfo2 = "";
    var count = 0;
    for (var i = 0; i < y.length; i++) {
        var c = y[i];
        var byte = c.toString(2);
        byte = addPadding(byte,8); 
        var xor1 = byte[2] ^ redu[count];
        count++; 
        var xor2 = byte[3] ^ redu[count];
        count++;
        var xor3 = byte[4] ^ redu[count];
        count++;
        var xor4 = byte[5] ^ redu[count];
        count++;
        bitsInfo = bitsInfo + xor1 + xor2 + xor3 + xor4 + byte[6] + byte[7];
        bitsInfo2 =  bitsInfo2 + byte[0] + byte[1] + xor1 + xor2 + xor3 + xor4 + byte[6] + byte[7];
    }

    console.log(bitsInfo);
    if (bitsInfo.length % 8 != 0) {
        var padding = 8 - bitsInfo.length % 8;
        bitsInfo = bitsInfo + "0".repeat(padding);
    }
    
    return bitsArray2Int(bitsInfo);
};

var bitsArray2Int = function(bits) {
    var bitCount = 0;
    var byte = "";
    var bytes = new Array();
    var byteCount = 0;
    for (var i = 0; i < bits.length; i++) {
        byte = byte + bits[i];
        bitCount++;
        if(bitCount == 8){
            bitCount = 0;
            bytes[byteCount] = bin2AsiiCode(byte);
            byte = "";
            byteCount++;
        }
    }
    return bytes;
};

var generateMessage = function(b,id,text){
    var m = "";
    for(i=0;i<b.length;i++){
        var code = b[i];
        m = m + String.fromCharCode(code);
    }
    var bitsCount = text.length.toString(2);
    bitsCount = addPadding(bitsCount,16);
    var numBytes = bitsArray2Int(bitsCount);
    var charBytes = intArraytoString(numBytes);
    var idBits = "";
    for(i=0;i<id.length;i++){
        var hex = id[i];
        idBits = idBits + hex2bin(hex);
    }
    var idCodes = bitsArray2Int(idBits);
    var idBytes = intArraytoString(idCodes);
    var message =  charBytes + idBytes + m;
    console.log(message.length);
    return message;
}

var intArraytoString = function(array){

    var bytes = "";
    for(i=0;i<array.length;i++){
        var code = array[i];
        bytes = bytes + String.fromCharCode(code);
    }
    return bytes;
};

var bin2AsiiCode = function (byte) {
    return parseInt(byte, 2);
};

var addPadding = function(byte,bitsSize) {
    
    var padding = bitsSize - byte.length;
    var newByte = "0".repeat(padding) + byte;
    return newByte;
};

var hex2bin = function (hex){
    return (parseInt(hex, 16).toString(2)).padStart(4, '0');
}

/* 
 Implementação do RS abaixo...
 Implementação do RS abaixo...
 Implementação do RS abaixo...
 Implementação do RS abaixo...
 Implementação do RS abaixo...
 Implementação do RS abaixo...
 Implementação do RS abaixo...
 Implementação do RS abaixo...
 Implementação do RS abaixo...
 Implementação do RS abaixo...
 Implementação do RS abaixo...
 Implementação do RS abaixo...
*/























/*----------------------- CLASSE DO REED SOLOMON -----------------------------*/

var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
/* Generated from Java with JSweet 2.2.0-SNAPSHOT - http://www.jsweet.org */

var ReedSolomonException = (function (_super) {
    __extends(ReedSolomonException, _super);
    function ReedSolomonException(message) {
        var _this = _super.call(this, message) || this;
        _this.message = message;
        Object.setPrototypeOf(_this, ReedSolomonException.prototype);
        return _this;
    }
    return ReedSolomonException;
}(Error));
ReedSolomonException["__class"] = "ReedSolomonException";
ReedSolomonException["__interfaces"] = ["java.io.Serializable"];
var ReedSolomonEncoder = (function () {
    function ReedSolomonEncoder(field) {
        if (this.field === undefined)
            this.field = null;
        if (this.cachedGenerators === undefined)
            this.cachedGenerators = null;
        this.field = field;
        this.cachedGenerators = ([]);
        /* add */ (this.cachedGenerators.push(new GenericGFPoly(field, [1])) > 0);
    }
    /*private*/ ReedSolomonEncoder.prototype.buildGenerator = function (degree) {
        if (degree >= this.cachedGenerators.length) {
            var lastGenerator = this.cachedGenerators[this.cachedGenerators.length - 1];
            for (var d = this.cachedGenerators.length; d <= degree; d++) {
                {
                    var nextGenerator = lastGenerator.multiply$GenericGFPoly(new GenericGFPoly(this.field, [1, this.field.exp(d - 1 + this.field.getGeneratorBase())]));
                    /* add */ (this.cachedGenerators.push(nextGenerator) > 0);
                    lastGenerator = nextGenerator;
                }
                ;
            }
        }
        return this.cachedGenerators[degree];
    };
    ReedSolomonEncoder.prototype.encode = function (toEncode, ecBytes) {
        if (ecBytes === 0) {
            throw Object.defineProperty(new Error("No error correction bytes"), '__classes', { configurable: true, value: ['java.lang.Throwable', 'java.lang.Object', 'java.lang.RuntimeException', 'java.lang.IllegalArgumentException', 'java.lang.Exception'] });
        }
        var dataBytes = toEncode.length - ecBytes;
        if (dataBytes <= 0) {
            throw Object.defineProperty(new Error("No data bytes provided"), '__classes', { configurable: true, value: ['java.lang.Throwable', 'java.lang.Object', 'java.lang.RuntimeException', 'java.lang.IllegalArgumentException', 'java.lang.Exception'] });
        }
        var generator = this.buildGenerator(ecBytes);
        var infoCoefficients = (function (s) { var a = []; while (s-- > 0)
            a.push(0); return a; })(dataBytes);
        /* arraycopy */ (function (srcPts, srcOff, dstPts, dstOff, size) { if (srcPts !== dstPts || dstOff >= srcOff + size) {
            while (--size >= 0)
                dstPts[dstOff++] = srcPts[srcOff++];
        }
        else {
            var tmp = srcPts.slice(srcOff, srcOff + size);
            for (var i = 0; i < size; i++)
                dstPts[dstOff++] = tmp[i];
        } })(toEncode, 0, infoCoefficients, 0, dataBytes);
        var info = new GenericGFPoly(this.field, infoCoefficients);
        info = info.multiplyByMonomial(ecBytes, 1);
        var remainder = info.divide(generator)[1];
        var coefficients = remainder.getCoefficients();
        var numZeroCoefficients = ecBytes - coefficients.length;
        for (var i = 0; i < numZeroCoefficients; i++) {
            {
                toEncode[dataBytes + i] = 0;
            }
            ;
        }
        /* arraycopy */ (function (srcPts, srcOff, dstPts, dstOff, size) { if (srcPts !== dstPts || dstOff >= srcOff + size) {
            while (--size >= 0)
                dstPts[dstOff++] = srcPts[srcOff++];
        }
        else {
            var tmp = srcPts.slice(srcOff, srcOff + size);
            for (var i = 0; i < size; i++)
                dstPts[dstOff++] = tmp[i];
        } })(coefficients, 0, toEncode, dataBytes + numZeroCoefficients, coefficients.length);
    };
    return ReedSolomonEncoder;
}());
ReedSolomonEncoder["__class"] = "ReedSolomonEncoder";
var ReedSolomonDecoder = (function () {
    function ReedSolomonDecoder(field) {
        if (this.field === undefined)
            this.field = null;
        this.field = field;
    }
    /**
     * <p>
     * Decodes given set of received codewords, which include both data and
     * error-correction codewords. Really, this means it uses Reed-Solomon to
     * detect and correct errors, in-place, in the input.
     * </p>
     *
     * @param {Array} received
     * data and error-correction codewords
     * @param {number} twoS
     * number of error-correction codewords available
     * @throws ReedSolomonException
     * if decoding fails for any reason
     */
    ReedSolomonDecoder.prototype.decode = function (received, twoS) {
        var poly = new GenericGFPoly(this.field, received);
        var syndromeCoefficients = (function (s) { var a = []; while (s-- > 0)
            a.push(0); return a; })(twoS);
        var noError = true;
        for (var i = 0; i < twoS; i++) {
            {
                var __eval = poly.evaluateAt(this.field.exp(i + this.field.getGeneratorBase()));
                syndromeCoefficients[syndromeCoefficients.length - 1 - i] = __eval;
                if (__eval !== 0) {
                    noError = false;
                }
            }
            ;
        }
        if (noError) {
            return;
        }
        var syndrome = new GenericGFPoly(this.field, syndromeCoefficients);
        var sigmaOmega = this.runEuclideanAlgorithm(this.field.buildMonomial(twoS, 1), syndrome, twoS);
        var sigma = sigmaOmega[0];
        var omega = sigmaOmega[1];
        var errorLocations = this.findErrorLocations(sigma);
        var errorMagnitudes = this.findErrorMagnitudes(omega, errorLocations);
        for (var i = 0; i < errorLocations.length; i++) {
            {
                var position = received.length - 1 - this.field.log(errorLocations[i]);
                if (position < 0) {
                    throw new ReedSolomonException("Bad error location");
                }
                received[position] = GenericGF.addOrSubtract(received[position], errorMagnitudes[i]);
            }
            ;
        }
    };
    /*private*/ ReedSolomonDecoder.prototype.runEuclideanAlgorithm = function (a, b, R) {
        if (a.getDegree() < b.getDegree()) {
            var temp = a;
            a = b;
            b = temp;
        }
        var rLast = a;
        var r = b;
        var tLast = this.field.getZero();
        var t = this.field.getOne();
        while ((r.getDegree() >= (R / 2 | 0))) {
            {
                var rLastLast = rLast;
                var tLastLast = tLast;
                rLast = r;
                tLast = t;
                if (rLast.isZero()) {
                    throw new ReedSolomonException("r_{i-1} was zero");
                }
                r = rLastLast;
                var q = this.field.getZero();
                var denominatorLeadingTerm = rLast.getCoefficient(rLast.getDegree());
                var dltInverse = this.field.inverse(denominatorLeadingTerm);
                while ((r.getDegree() >= rLast.getDegree() && !r.isZero())) {
                    {
                        var degreeDiff = r.getDegree() - rLast.getDegree();
                        var scale = this.field.multiply(r.getCoefficient(r.getDegree()), dltInverse);
                        q = q.addOrSubtract(this.field.buildMonomial(degreeDiff, scale));
                        r = r.addOrSubtract(rLast.multiplyByMonomial(degreeDiff, scale));
                    }
                }
                ;
                t = q.multiply$GenericGFPoly(tLast).addOrSubtract(tLastLast);
                if (r.getDegree() >= rLast.getDegree()) {
                    throw Object.defineProperty(new Error("Division algorithm failed to reduce polynomial?"), '__classes', { configurable: true, value: ['java.lang.Throwable', 'java.lang.IllegalStateException', 'java.lang.Object', 'java.lang.RuntimeException', 'java.lang.Exception'] });
                }
            }
        }
        ;
        var sigmaTildeAtZero = t.getCoefficient(0);
        if (sigmaTildeAtZero === 0) {
            throw new ReedSolomonException("sigmaTilde(0) was zero");
        }
        var inverse = this.field.inverse(sigmaTildeAtZero);
        var sigma = t.multiply$int(inverse);
        var omega = r.multiply$int(inverse);
        return [sigma, omega];
    };
    /*private*/ ReedSolomonDecoder.prototype.findErrorLocations = function (errorLocator) {
        var numErrors = errorLocator.getDegree();
        if (numErrors === 1) {
            return [errorLocator.getCoefficient(1)];
        }
        var result = (function (s) { var a = []; while (s-- > 0)
            a.push(0); return a; })(numErrors);
        var e = 0;
        for (var i = 1; i < this.field.getSize() && e < numErrors; i++) {
            {
                if (errorLocator.evaluateAt(i) === 0) {
                    result[e] = this.field.inverse(i);
                    e++;
                }
            }
            ;
        }
        if (e !== numErrors) {
            console.info("Number of corrupted higher than t");
            throw new ReedSolomonException("Error locator degree does not match number of roots");
        }
        else {
            console.info("Number of corrupted symbols: " + numErrors);
        }
        return result;
    };
    /*private*/ ReedSolomonDecoder.prototype.findErrorMagnitudes = function (errorEvaluator, errorLocations) {
        var s = errorLocations.length;
        var result = (function (s) { var a = []; while (s-- > 0)
            a.push(0); return a; })(s);
        for (var i = 0; i < s; i++) {
            {
                var xiInverse = this.field.inverse(errorLocations[i]);
                var denominator = 1;
                for (var j = 0; j < s; j++) {
                    {
                        if (i !== j) {
                            var term = this.field.multiply(errorLocations[j], xiInverse);
                            var termPlus1 = (term & 1) === 0 ? term | 1 : term & ~1;
                            denominator = this.field.multiply(denominator, termPlus1);
                        }
                    }
                    ;
                }
                result[i] = this.field.multiply(errorEvaluator.evaluateAt(xiInverse), this.field.inverse(denominator));
                if (this.field.getGeneratorBase() !== 0) {
                    result[i] = this.field.multiply(result[i], xiInverse);
                }
            }
            ;
        }
        return result;
    };
    return ReedSolomonDecoder;
}());
ReedSolomonDecoder["__class"] = "ReedSolomonDecoder";
var GenericGFPoly = (function () {
    function GenericGFPoly(field, coefficients) {
        if (this.field === undefined)
            this.field = null;
        if (this.coefficients === undefined)
            this.coefficients = null;
        if (coefficients.length === 0) {
            throw Object.defineProperty(new Error(), '__classes', { configurable: true, value: ['java.lang.Throwable', 'java.lang.Object', 'java.lang.RuntimeException', 'java.lang.IllegalArgumentException', 'java.lang.Exception'] });
        }
        this.field = field;
        var coefficientsLength = coefficients.length;
        if (coefficientsLength > 1 && coefficients[0] === 0) {
            var firstNonZero = 1;
            while ((firstNonZero < coefficientsLength && coefficients[firstNonZero] === 0)) {
                {
                    firstNonZero++;
                }
            }
            ;
            if (firstNonZero === coefficientsLength) {
                this.coefficients = [0];
            }
            else {
                this.coefficients = (function (s) { var a = []; while (s-- > 0)
                    a.push(0); return a; })(coefficientsLength - firstNonZero);
                /* arraycopy */ (function (srcPts, srcOff, dstPts, dstOff, size) { if (srcPts !== dstPts || dstOff >= srcOff + size) {
                    while (--size >= 0)
                        dstPts[dstOff++] = srcPts[srcOff++];
                }
                else {
                    var tmp = srcPts.slice(srcOff, srcOff + size);
                    for (var i = 0; i < size; i++)
                        dstPts[dstOff++] = tmp[i];
                } })(coefficients, firstNonZero, this.coefficients, 0, this.coefficients.length);
            }
        }
        else {
            this.coefficients = coefficients;
        }
    }
    GenericGFPoly.prototype.getCoefficients = function () {
        return this.coefficients;
    };
    /**
     * @return {number} degree of this polynomial
     */
    GenericGFPoly.prototype.getDegree = function () {
        return this.coefficients.length - 1;
    };
    /**
     * @return {boolean} true iff this polynomial is the monomial "0"
     */
    GenericGFPoly.prototype.isZero = function () {
        return this.coefficients[0] === 0;
    };
    /**
     * @return {number} coefficient of x^degree term in this polynomial
     * @param {number} degree
     */
    GenericGFPoly.prototype.getCoefficient = function (degree) {
        return this.coefficients[this.coefficients.length - 1 - degree];
    };
    /**
     * @return {number} evaluation of this polynomial at a given point
     * @param {number} a
     */
    GenericGFPoly.prototype.evaluateAt = function (a) {
        if (a === 0) {
            return this.getCoefficient(0);
        }
        var size = this.coefficients.length;
        if (a === 1) {
            var result_1 = 0;
            for (var index5907 = 0; index5907 < this.coefficients.length; index5907++) {
                var coefficient = this.coefficients[index5907];
                {
                    result_1 = GenericGF.addOrSubtract(result_1, coefficient);
                }
            }
            return result_1;
        }
        var result = this.coefficients[0];
        for (var i = 1; i < size; i++) {
            {
                result = GenericGF.addOrSubtract(this.field.multiply(a, result), this.coefficients[i]);
            }
            ;
        }
        return result;
    };
    GenericGFPoly.prototype.addOrSubtract = function (other) {
        if (!(function (o1, o2) { if (o1 && o1.equals) {
            return o1.equals(o2);
        }
        else {
            return o1 === o2;
        } })(this.field, other.field)) {
            throw Object.defineProperty(new Error("GenericGFPolys do not have same GenericGF field"), '__classes', { configurable: true, value: ['java.lang.Throwable', 'java.lang.Object', 'java.lang.RuntimeException', 'java.lang.IllegalArgumentException', 'java.lang.Exception'] });
        }
        if (this.isZero()) {
            return other;
        }
        if (other.isZero()) {
            return this;
        }
        var smallerCoefficients = this.coefficients;
        var largerCoefficients = other.coefficients;
        if (smallerCoefficients.length > largerCoefficients.length) {
            var temp = smallerCoefficients;
            smallerCoefficients = largerCoefficients;
            largerCoefficients = temp;
        }
        var sumDiff = (function (s) { var a = []; while (s-- > 0)
            a.push(0); return a; })(largerCoefficients.length);
        var lengthDiff = largerCoefficients.length - smallerCoefficients.length;
        /* arraycopy */ (function (srcPts, srcOff, dstPts, dstOff, size) { if (srcPts !== dstPts || dstOff >= srcOff + size) {
            while (--size >= 0)
                dstPts[dstOff++] = srcPts[srcOff++];
        }
        else {
            var tmp = srcPts.slice(srcOff, srcOff + size);
            for (var i = 0; i < size; i++)
                dstPts[dstOff++] = tmp[i];
        } })(largerCoefficients, 0, sumDiff, 0, lengthDiff);
        for (var i = lengthDiff; i < largerCoefficients.length; i++) {
            {
                sumDiff[i] = GenericGF.addOrSubtract(smallerCoefficients[i - lengthDiff], largerCoefficients[i]);
            }
            ;
        }
        return new GenericGFPoly(this.field, sumDiff);
    };
    GenericGFPoly.prototype.multiply$GenericGFPoly = function (other) {
        if (!(function (o1, o2) { if (o1 && o1.equals) {
            return o1.equals(o2);
        }
        else {
            return o1 === o2;
        } })(this.field, other.field)) {
            throw Object.defineProperty(new Error("GenericGFPolys do not have same GenericGF field"), '__classes', { configurable: true, value: ['java.lang.Throwable', 'java.lang.Object', 'java.lang.RuntimeException', 'java.lang.IllegalArgumentException', 'java.lang.Exception'] });
        }
        if (this.isZero() || other.isZero()) {
            return this.field.getZero();
        }
        var aCoefficients = this.coefficients;
        var aLength = aCoefficients.length;
        var bCoefficients = other.coefficients;
        var bLength = bCoefficients.length;
        var product = (function (s) { var a = []; while (s-- > 0)
            a.push(0); return a; })(aLength + bLength - 1);
        for (var i = 0; i < aLength; i++) {
            {
                var aCoeff = aCoefficients[i];
                for (var j = 0; j < bLength; j++) {
                    {
                        product[i + j] = GenericGF.addOrSubtract(product[i + j], this.field.multiply(aCoeff, bCoefficients[j]));
                    }
                    ;
                }
            }
            ;
        }
        return new GenericGFPoly(this.field, product);
    };
    GenericGFPoly.prototype.multiply = function (other) {
        if (((other != null && other instanceof GenericGFPoly) || other === null)) {
            return this.multiply$GenericGFPoly(other);
        }
        else if (((typeof other === 'number') || other === null)) {
            return this.multiply$int(other);
        }
        else
            throw new Error('invalid overload');
    };
    GenericGFPoly.prototype.multiply$int = function (scalar) {
        if (scalar === 0) {
            return this.field.getZero();
        }
        if (scalar === 1) {
            return this;
        }
        var size = this.coefficients.length;
        var product = (function (s) { var a = []; while (s-- > 0)
            a.push(0); return a; })(size);
        for (var i = 0; i < size; i++) {
            {
                product[i] = this.field.multiply(this.coefficients[i], scalar);
            }
            ;
        }
        return new GenericGFPoly(this.field, product);
    };
    GenericGFPoly.prototype.multiplyByMonomial = function (degree, coefficient) {
        if (degree < 0) {
            throw Object.defineProperty(new Error(), '__classes', { configurable: true, value: ['java.lang.Throwable', 'java.lang.Object', 'java.lang.RuntimeException', 'java.lang.IllegalArgumentException', 'java.lang.Exception'] });
        }
        if (coefficient === 0) {
            return this.field.getZero();
        }
        var size = this.coefficients.length;
        var product = (function (s) { var a = []; while (s-- > 0)
            a.push(0); return a; })(size + degree);
        for (var i = 0; i < size; i++) {
            {
                product[i] = this.field.multiply(this.coefficients[i], coefficient);
            }
            ;
        }
        return new GenericGFPoly(this.field, product);
    };
    GenericGFPoly.prototype.divide = function (other) {
        if (!(function (o1, o2) { if (o1 && o1.equals) {
            return o1.equals(o2);
        }
        else {
            return o1 === o2;
        } })(this.field, other.field)) {
            throw Object.defineProperty(new Error("GenericGFPolys do not have same GenericGF field"), '__classes', { configurable: true, value: ['java.lang.Throwable', 'java.lang.Object', 'java.lang.RuntimeException', 'java.lang.IllegalArgumentException', 'java.lang.Exception'] });
        }
        if (other.isZero()) {
            throw Object.defineProperty(new Error("Divide by 0"), '__classes', { configurable: true, value: ['java.lang.Throwable', 'java.lang.Object', 'java.lang.RuntimeException', 'java.lang.IllegalArgumentException', 'java.lang.Exception'] });
        }
        var quotient = this.field.getZero();
        var remainder = this;
        var denominatorLeadingTerm = other.getCoefficient(other.getDegree());
        var inverseDenominatorLeadingTerm = this.field.inverse(denominatorLeadingTerm);
        while ((remainder.getDegree() >= other.getDegree() && !remainder.isZero())) {
            {
                var degreeDifference = remainder.getDegree() - other.getDegree();
                var scale = this.field.multiply(remainder.getCoefficient(remainder.getDegree()), inverseDenominatorLeadingTerm);
                var term = other.multiplyByMonomial(degreeDifference, scale);
                var iterationQuotient = this.field.buildMonomial(degreeDifference, scale);
                quotient = quotient.addOrSubtract(iterationQuotient);
                remainder = remainder.addOrSubtract(term);
            }
        }
        ;
        return [quotient, remainder];
    };
    /**
     *
     * @return {string}
     */
    GenericGFPoly.prototype.toString = function () {
        var result = { str: "", toString: function () { return this.str; } };
        var _loop_1 = function (degree) {
            {
                var coefficient = this_1.getCoefficient(degree);
                if (coefficient !== 0) {
                    if (coefficient < 0) {
                        /* append */ (function (sb) { sb.str = sb.str.concat(" - "); return sb; })(result);
                        coefficient = -coefficient;
                    }
                    else {
                        if (result.str.length > 0) {
                            /* append */ (function (sb) { sb.str = sb.str.concat(" + "); return sb; })(result);
                        }
                    }
                    if (degree === 0 || coefficient !== 1) {
                        var alphaPower_1 = this_1.field.log(coefficient);
                        if (alphaPower_1 === 0) {
                            /* append */ (function (sb) { sb.str = sb.str.concat('1'); return sb; })(result);
                        }
                        else if (alphaPower_1 === 1) {
                            /* append */ (function (sb) { sb.str = sb.str.concat('a'); return sb; })(result);
                        }
                        else {
                            /* append */ (function (sb) { sb.str = sb.str.concat("a^"); return sb; })(result);
                            /* append */ (function (sb) { sb.str = sb.str.concat(alphaPower_1); return sb; })(result);
                        }
                    }
                    if (degree !== 0) {
                        if (degree === 1) {
                            /* append */ (function (sb) { sb.str = sb.str.concat('x'); return sb; })(result);
                        }
                        else {
                            /* append */ (function (sb) { sb.str = sb.str.concat("x^"); return sb; })(result);
                            /* append */ (function (sb) { sb.str = sb.str.concat(degree); return sb; })(result);
                        }
                    }
                }
            }
            ;
        };
        var this_1 = this;
        for (var degree = this.getDegree(); degree >= 0; degree--) {
            _loop_1(degree);
        }
        return result.str;
    };
    return GenericGFPoly;
}());
GenericGFPoly["__class"] = "GenericGFPoly";
/**
 * Create a representation of GF(size) using the given primitive polynomial.
 *
 * @param {number} primitive irreducible polynomial whose coefficients are represented by
 * the bits of an int, where the least-significant bit represents the constant
 * coefficient
 * @param {number} size the size of the field
 * @param {number} b the factor b in the generator polynomial can be 0- or 1-based
 * (g(x) = (x+a^b)(x+a^(b+1))...(x+a^(b+2t-1))).
 * In most cases it should be 1, but for QR code it is 0.
 * @class
 */
var GenericGF = (function () {
    function GenericGF(primitive, size, b) {
        if (this.expTable === undefined)
            this.expTable = null;
        if (this.logTable === undefined)
            this.logTable = null;
        if (this.zero === undefined)
            this.zero = null;
        if (this.one === undefined)
            this.one = null;
        if (this.size === undefined)
            this.size = 0;
        if (this.primitive === undefined)
            this.primitive = 0;
        if (this.generatorBase === undefined)
            this.generatorBase = 0;
        this.primitive = primitive;
        this.size = size;
        this.generatorBase = b;
        this.expTable = (function (s) { var a = []; while (s-- > 0)
            a.push(0); return a; })(size);
        this.logTable = (function (s) { var a = []; while (s-- > 0)
            a.push(0); return a; })(size);
        var x = 1;
        for (var i = 0; i < size; i++) {
            {
                this.expTable[i] = x;
                x *= 2;
                if (x >= size) {
                    x ^= primitive;
                    x &= size - 1;
                }
            }
            ;
        }
        for (var i = 0; i < size - 1; i++) {
            {
                this.logTable[this.expTable[i]] = i;
            }
            ;
        }
        this.zero = new GenericGFPoly(this, [0]);
        this.one = new GenericGFPoly(this, [1]);
    }
    GenericGF.AZTEC_DATA_12_$LI$ = function () { if (GenericGF.AZTEC_DATA_12 == null)
        GenericGF.AZTEC_DATA_12 = new GenericGF(4201, 4096, 1); return GenericGF.AZTEC_DATA_12; };
    ;
    GenericGF.AZTEC_DATA_10_$LI$ = function () { if (GenericGF.AZTEC_DATA_10 == null)
        GenericGF.AZTEC_DATA_10 = new GenericGF(1033, 1024, 1); return GenericGF.AZTEC_DATA_10; };
    ;
    GenericGF.AZTEC_DATA_6_$LI$ = function () { if (GenericGF.AZTEC_DATA_6 == null)
        GenericGF.AZTEC_DATA_6 = new GenericGF(67, 64, 1); return GenericGF.AZTEC_DATA_6; };
    ;
    GenericGF.AZTEC_PARAM_$LI$ = function () { if (GenericGF.AZTEC_PARAM == null)
        GenericGF.AZTEC_PARAM = new GenericGF(19, 16, 1); return GenericGF.AZTEC_PARAM; };
    ;
    GenericGF.QR_CODE_FIELD_256_$LI$ = function () { if (GenericGF.QR_CODE_FIELD_256 == null)
        GenericGF.QR_CODE_FIELD_256 = new GenericGF(285, 256, 0); return GenericGF.QR_CODE_FIELD_256; };
    ;
    GenericGF.DATA_MATRIX_FIELD_256_$LI$ = function () { if (GenericGF.DATA_MATRIX_FIELD_256 == null)
        GenericGF.DATA_MATRIX_FIELD_256 = new GenericGF(301, 256, 1); return GenericGF.DATA_MATRIX_FIELD_256; };
    ;
    GenericGF.AZTEC_DATA_8_$LI$ = function () { if (GenericGF.AZTEC_DATA_8 == null)
        GenericGF.AZTEC_DATA_8 = GenericGF.DATA_MATRIX_FIELD_256_$LI$(); return GenericGF.AZTEC_DATA_8; };
    ;
    GenericGF.MAXICODE_FIELD_64_$LI$ = function () { if (GenericGF.MAXICODE_FIELD_64 == null)
        GenericGF.MAXICODE_FIELD_64 = GenericGF.AZTEC_DATA_6_$LI$(); return GenericGF.MAXICODE_FIELD_64; };
    ;
    GenericGF.prototype.getZero = function () {
        return this.zero;
    };
    GenericGF.prototype.getOne = function () {
        return this.one;
    };
    /**
     * @return {GenericGFPoly} the monomial representing coefficient * x^degree
     * @param {number} degree
     * @param {number} coefficient
     */
    GenericGF.prototype.buildMonomial = function (degree, coefficient) {
        if (degree < 0) {
            throw Object.defineProperty(new Error(), '__classes', { configurable: true, value: ['java.lang.Throwable', 'java.lang.Object', 'java.lang.RuntimeException', 'java.lang.IllegalArgumentException', 'java.lang.Exception'] });
        }
        if (coefficient === 0) {
            return this.zero;
        }
        var coefficients = (function (s) { var a = []; while (s-- > 0)
            a.push(0); return a; })(degree + 1);
        coefficients[0] = coefficient;
        return new GenericGFPoly(this, coefficients);
    };
    /**
     * Implements both addition and subtraction -- they are the same in GF(size).
     *
     * @return {number} sum/difference of a and b
     * @param {number} a
     * @param {number} b
     */
    GenericGF.addOrSubtract = function (a, b) {
        return a ^ b;
    };
    /**
     * @return {number} 2 to the power of a in GF(size)
     * @param {number} a
     */
    GenericGF.prototype.exp = function (a) {
        return this.expTable[a];
    };
    /**
     * @return {number} base 2 log of a in GF(size)
     * @param {number} a
     */
    GenericGF.prototype.log = function (a) {
        if (a === 0) {
            throw Object.defineProperty(new Error(), '__classes', { configurable: true, value: ['java.lang.Throwable', 'java.lang.Object', 'java.lang.RuntimeException', 'java.lang.IllegalArgumentException', 'java.lang.Exception'] });
        }
        return this.logTable[a];
    };
    /**
     * @return {number} multiplicative inverse of a
     * @param {number} a
     */
    GenericGF.prototype.inverse = function (a) {
        if (a === 0) {
            throw Object.defineProperty(new Error(), '__classes', { configurable: true, value: ['java.lang.Throwable', 'java.lang.ArithmeticException', 'java.lang.Object', 'java.lang.RuntimeException', 'java.lang.Exception'] });
        }
        return this.expTable[this.size - this.logTable[a] - 1];
    };
    /**
     * @return {number} product of a and b in GF(size)
     * @param {number} a
     * @param {number} b
     */
    GenericGF.prototype.multiply = function (a, b) {
        if (a === 0 || b === 0) {
            return 0;
        }
        return this.expTable[(this.logTable[a] + this.logTable[b]) % (this.size - 1)];
    };
    GenericGF.prototype.getSize = function () {
        return this.size;
    };
    GenericGF.prototype.getGeneratorBase = function () {
        return this.generatorBase;
    };
    /**
     *
     * @return {string}
     */
    GenericGF.prototype.toString = function () {
        return "GF(0x" + javaemul.internal.IntegerHelper.toHexString(this.primitive) + ',' + this.size + ')';
    };
    return GenericGF;
}());
GenericGF["__class"] = "GenericGF";
GenericGF.MAXICODE_FIELD_64_$LI$();
GenericGF.AZTEC_DATA_8_$LI$();
GenericGF.DATA_MATRIX_FIELD_256_$LI$();
GenericGF.QR_CODE_FIELD_256_$LI$();
GenericGF.AZTEC_PARAM_$LI$();
GenericGF.AZTEC_DATA_6_$LI$();
GenericGF.AZTEC_DATA_10_$LI$();
GenericGF.AZTEC_DATA_12_$LI$();


  