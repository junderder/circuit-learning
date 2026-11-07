/* =========================================================
   电路学堂 · 公式推导数据
   每条推导由若干“步骤”组成：一个公式 + 一句说明。
   公式里用 <mark> 标出“这一步新出现的关键项”，播放时会扫过高亮。
   ========================================================= */
(function () {
  'use strict';

  const F = (a, b) => '<span class="frac"><span>' + a + '</span><span>' + b + '</span></span>';
  const SQ = (x) => '<span class="sqrt"><span class="rad">' + x + '</span></span>';
  const M = (x) => '<mark>' + x + '</mark>';

  window.DERIVATIONS = [
    /* ---------------------------------------------------------- */
    {
      id: 'divider',
      ch: 'kcl-kvl',
      title: '串联分压公式',
      subtitle: '两个电阻串联，为什么分到的电压与阻值成正比？',
      steps: [
        { eq: 'u = u<sub>1</sub> + u<sub>2</sub>', note: '对串联回路列 KVL：总电压等于两个电阻上的电压降之和。' },
        { eq: 'u<sub>1</sub> = R<sub>1</sub>·i，　u<sub>2</sub> = R<sub>2</sub>·i', note: '串联时流过两个电阻的是同一个电流 i，各自满足欧姆定律。' },
        { eq: 'u = (R<sub>1</sub> + R<sub>2</sub>)·i', note: '把两式代回 KVL，得到“总电压 = 总电阻 × 电流”。' },
        { eq: 'i = ' + F('u', 'R<sub>1</sub> + R<sub>2</sub>'), note: '于是电流由总电压和总电阻唯一确定——这就是串联电路的“总电流”。' },
        { eq: 'u<sub>2</sub> = R<sub>2</sub>·i = ' + M(F('R<sub>2</sub>', 'R<sub>1</sub> + R<sub>2</sub>')) + '·u', note: '把 i 代回 u₂：分压比只由电阻之比决定。分子是“本电阻”，电阻越大分得越多。' }
      ]
    },

    /* ---------------------------------------------------------- */
    {
      id: 'node-method',
      ch: 'analysis',
      title: '节点电压法方程',
      subtitle: '自导为什么恒为正、互导为什么取负？方程从哪来？',
      steps: [
        { eq: 'Σ i = 0', note: '对节点 k 列 KCL：所有从该节点流出的支路电流之和为零。' },
        { eq: 'i<sub>kj</sub> = ' + F('u<sub>k</sub> − u<sub>j</sub>', 'R<sub>kj</sub>'), note: '每条支路的电流都可以用两端节点电压之差除以电阻表示（欧姆定律）。' },
        { eq: 'Σ<sub>j</sub> ' + F('u<sub>k</sub> − u<sub>j</sub>', 'R<sub>kj</sub>') + ' = Σ i<sub>s</sub>', note: '代入 KCL，等式右边是全部分流进该节点的电流源电流。' },
        { eq: '（Σ<sub>j</sub> ' + F('1', 'R<sub>kj</sub>') + '）u<sub>k</sub> − Σ<sub>j</sub> ' + F('u<sub>j</sub>', 'R<sub>kj</sub>') + ' = Σ i<sub>s</sub>', note: '按 u<sub>k</sub> 与 u<sub>j</sub> 合并同类项：u<sub>k</sub> 的系数是该节点所连电导之和。' },
        { eq: M('G<sub>kk</sub>') + 'u<sub>k</sub> + Σ ' + M('G<sub>kj</sub>') + 'u<sub>j</sub> = i<sub>sk</sub>', note: '记 G<sub>kk</sub> = Σ1/R（自导，恒正），G<sub>kj</sub> = −1/R（互导，取负）。负号来自“u<sub>k</sub> − u<sub>j</sub>”的展开。' },
        { eq: 'G·u = i<sub>s</sub>', note: '写成矩阵形式 G·u = i<sub>s</sub>。不含受控源时 G 是对称矩阵——这正是互易性的体现。' }
      ]
    },

    /* ---------------------------------------------------------- */
    {
      id: 'thevenin',
      ch: 'theorems',
      title: '戴维南定理',
      subtitle: '为什么任何含源一端口都能等效成“电压源 + 电阻”？',
      steps: [
        { eq: 'u = f(i)', note: '在端口外加一个电流源 i，端口电压为 u。网络内部只含线性元件与独立源。' },
        { eq: 'u = A + B·i', note: '响应与激励成正比（叠加定理）：u 必是 i 的一次函数，A、B 只由网络内部决定。' },
        { eq: 'i = 0 ⇒ A = u<sub>oc</sub>', note: '令外接电流源为 0（相当于端口开路），此时端口电压就是开路电压 u<sub>oc</sub>。' },
        { eq: 'u = 0 ⇒ B = −' + F('u<sub>oc</sub>', 'i<sub>sc</sub>'), note: '令端口电压为 0（端口短路），电流即短路电流 i<sub>sc</sub>，由此定出斜率 B。' },
        { eq: M('u = u<sub>oc</sub> − R<sub>eq</sub>·i') + '，　R<sub>eq</sub> = ' + F('u<sub>oc</sub>', 'i<sub>sc</sub>'), note: '这个端口伏安关系恰好就是“理想电压源 u<sub>oc</sub> 串联电阻 R<sub>eq</sub>”的 VCR，戴维南等效成立。' }
      ]
    },

    /* ---------------------------------------------------------- */
    {
      id: 'maxpower',
      ch: 'theorems',
      title: '最大功率传输条件',
      subtitle: '为什么匹配条件是 R_L = R_eq，而不是越大越好？',
      steps: [
        { eq: 'i = ' + F('u<sub>oc</sub>', 'R<sub>eq</sub> + R<sub>L</sub>'), note: '戴维南等效后，电流由总电阻（内阻 + 负载）决定。' },
        { eq: 'P<sub>L</sub> = i<sup>2</sup>R<sub>L</sub> = ' + M(F('u<sub>oc</sub><sup>2</sup>·R<sub>L</sub>', '(R<sub>eq</sub> + R<sub>L</sub>)<sup>2</sup>')), note: '负载功率写成 R<sub>L</sub> 的函数：分子随 R<sub>L</sub> 增大，分母却按平方增长——极值一定在中间某处。' },
        { eq: 'dP<sub>L</sub>/dR<sub>L</sub> = u<sub>oc</sub><sup>2</sup>·' + F('(R<sub>eq</sub>+R<sub>L</sub>)<sup>2</sup> − 2R<sub>L</sub>(R<sub>eq</sub>+R<sub>L</sub>)', '(R<sub>eq</sub>+R<sub>L</sub>)<sup>4</sup>'), note: '用商的求导法则，对 R<sub>L</sub> 求导。' },
        { eq: 'dP<sub>L</sub>/dR<sub>L</sub> = u<sub>oc</sub><sup>2</sup>·' + F('R<sub>eq</sub> − R<sub>L</sub>', '(R<sub>eq</sub>+R<sub>L</sub>)<sup>3</sup>'), note: '约去一个 (R<sub>eq</sub>+R<sub>L</sub>)，分子只剩 R<sub>eq</sub> − R<sub>L</sub>。' },
        { eq: '令导数为 0 ⇒ ' + M('R<sub>L</sub> = R<sub>eq</sub>'), note: '导数为零处即最大功率点；R<sub>L</sub> 再大，分压虽多但电流太小，功率反而下降。' },
        { eq: 'P<sub>max</sub> = ' + M(F('u<sub>oc</sub><sup>2</sup>', '4R<sub>eq</sub>')), note: '代回 P<sub>L</sub> 得最大功率。此时内阻也消耗同样多的功率，效率只有 50%。' }
      ]
    },

    /* ---------------------------------------------------------- */
    {
      id: 'first-order',
      ch: 'first-order',
      title: '一阶电路三要素公式',
      subtitle: '指数响应、时间常数、三要素法是一回事吗？',
      steps: [
        { eq: 'C' + F('du<sub>C</sub>', 'dt') + ' + ' + F('u<sub>C</sub>', 'R') + ' = ' + F('U<sub>s</sub>', 'R'), note: '对 RC 充电电路列 KCL：电容电流 + 电阻电流 = 电源提供的电流。' },
        { eq: 'RC' + F('du<sub>C</sub>', 'dt') + ' + u<sub>C</sub> = U<sub>s</sub>', note: '两边乘以 R，得到标准形式的一阶线性微分方程，时间常数 τ = RC 已经隐约出现。' },
        { eq: 'u<sub>C</sub> = U<sub>s</sub> + A·e<sup>−t/τ</sup>', note: '通解 = 特解（稳态值 U<sub>s</sub>）+ 齐次解（指数衰减项）。' },
        { eq: 't = 0：U<sub>0</sub> = U<sub>s</sub> + A ⇒ A = U<sub>0</sub> − U<sub>s</sub>', note: '用初始条件定常数。注意 A 是“初始值与稳态值之差”，可以为负。' },
        { eq: M('u<sub>C</sub>(t) = U<sub>s</sub> + (U<sub>0</sub> − U<sub>s</sub>)·e<sup>−t/τ</sup>'), note: '这就是全响应。U<sub>0</sub> 是 f(0₊)，U<sub>s</sub> 是 f(∞)。' },
        { eq: M('f(t) = f(∞) + [f(0<sub>+</sub>) − f(∞)]·e<sup>−t/τ</sup>'), note: '把电容电压换成任意响应量、把 RC 换成 L/R，就得到对一切一阶电路都成立的“三要素法”。' }
      ]
    },

    /* ---------------------------------------------------------- */
    {
      id: 'second-order',
      ch: 'second-order',
      title: '二阶电路的特征方程',
      subtitle: 'RLC 串联为什么会振荡？α 与 ω₀ 从哪来？',
      steps: [
        { eq: 'u<sub>L</sub> + u<sub>R</sub> + u<sub>C</sub> = 0', note: '对 RLC 串联回路列 KVL（零输入时没有电源）。' },
        { eq: 'L' + F('di', 'dt') + ' + Ri + u<sub>C</sub> = 0', note: '代入 u<sub>L</sub> = L di/dt、u<sub>R</sub> = Ri。' },
        { eq: 'LC' + F('d<sup>2</sup>u<sub>C</sub>', 'dt<sup>2</sup>') + ' + RC' + F('du<sub>C</sub>', 'dt') + ' + u<sub>C</sub> = 0', note: '再用 i = C du<sub>C</sub>/dt 把电流也换成电容电压，得到二阶微分方程。' },
        { eq: '设 u<sub>C</sub> = A·e<sup>st</sup> ⇒ LCs<sup>2</sup> + RCs + 1 = 0', note: '指数函数求导只多乘一个 s，微分方程于是变成了关于 s 的代数方程——特征方程。' },
        { eq: 's<sub>1,2</sub> = −α ± ' + SQ('α<sup>2</sup> − ω<sub>0</sub><sup>2</sup>'), note: '二次方程求根。根号内的正负决定响应形态。' },
        { eq: 'α = ' + F('R', '2L') + '，　ω<sub>0</sub> = ' + F('1', SQ('LC')), note: 'α 是衰减系数（电阻耗能），ω₀ 是固有振荡频率（LC 交换能量）。α 与 ω₀ 的较量决定四种阻尼。' }
      ]
    },

    /* ---------------------------------------------------------- */
    {
      id: 'inductor-phasor',
      ch: 'phasor',
      title: '电感为什么是 jωL',
      subtitle: '“电压超前 90°”和“乘 j”是怎么来的？',
      steps: [
        { eq: 'i = I<sub>m</sub>·cos(ωt + ψ)', note: '设流过电感的电流为正弦量，初相 ψ。' },
        { eq: 'u = L' + F('di', 'dt') + ' = −ωLI<sub>m</sub>·sin(ωt + ψ)', note: '对时间求导：cos 的导数是 −sin，幅值多出一个 ω。' },
        { eq: 'u = ωLI<sub>m</sub>·cos(ωt + ψ + 90°)', note: '利用 −sinθ = cos(θ + 90°)，把结果写回余弦形式，便于比较相位。' },
        { eq: 'Ù = ωL·I∠(ψ + 90°)', note: '取有效值相量：幅值乘以 ωL，初相加上 90°——这正是“乘 j”的几何意义。' },
        { eq: 'Ù = jωL·(I∠ψ) = ' + M('jωL·İ'), note: '因为 1∠90° = j，所以相量关系简写为 Ù = jωL·İ，即 Z<sub>L</sub> = jωL。' }
      ]
    },

    /* ---------------------------------------------------------- */
    {
      id: 'complex-power',
      ch: 'ac-power',
      title: '复功率与 P、Q 的关系',
      subtitle: '为什么 S̃ = Ùİ* 的实部是有功、虚部是无功？',
      steps: [
        { eq: 'p = ui = UI[cosφ + cos(2ωt + ψ<sub>u</sub> + ψ<sub>i</sub>)]', note: '把 u、i 的瞬时值相乘并积化和差，得到“恒定项 + 二倍频项”。' },
        { eq: 'P = ' + M('UI·cosφ'), note: '一个周期内二倍频项平均为零，剩下的恒定项就是有功功率。' },
        { eq: 'S̃ = Ù·İ<sup>*</sup> = (U∠ψ<sub>u</sub>)(I∠−ψ<sub>i</sub>)', note: '用电压相量乘以电流的共轭相量（角度相减）。' },
        { eq: '= UI∠(ψ<sub>u</sub> − ψ<sub>i</sub>) = UI∠φ', note: '模是视在功率 UI，角是阻抗角 φ。' },
        { eq: '= ' + M('UIcosφ + jUIsinφ') + ' = P + jQ', note: '实部即有功 P，虚部即无功 Q。于是“三种功率”被一个复数统一起来。' }
      ]
    },

    /* ---------------------------------------------------------- */
    {
      id: 'pf-correction',
      ch: 'ac-power',
      title: '补偿电容的容量公式',
      subtitle: '把功率因数从 0.7 提到 0.95，到底要并多大电容？',
      steps: [
        { eq: 'Q<sub>1</sub> = P·tanφ<sub>1</sub>', note: '补偿前：已知有功 P 与功率因数角 φ₁，无功就是 P·tanφ₁。' },
        { eq: 'Q<sub>2</sub> = P·tanφ<sub>2</sub>', note: '补偿后目标角为 φ₂。负载本身不变，所以有功 P 仍是原来那个值。' },
        { eq: 'Q<sub>C</sub> = Q<sub>1</sub> − Q<sub>2</sub> = P(tanφ<sub>1</sub> − tanφ<sub>2</sub>)', note: '需要电容“发出”的无功，正好是减少的那一部分无功。' },
        { eq: 'Q<sub>C</sub> = U<sup>2</sup>·ωC', note: '电容的无功与电压平方、角频率、容量成正比（由 Q = U²/X<sub>C</sub> 与 X<sub>C</sub> = 1/ωC 得到）。' },
        { eq: M('C = ' + F('P(tanφ<sub>1</sub> − tanφ<sub>2</sub>)', 'ωU<sup>2</sup>')), note: '两式联立即得补偿电容公式。注意式中用的是有功 P 与电压 U，与负载接法无关。' }
      ]
    },

    /* ---------------------------------------------------------- */
    {
      id: 'three-phase-power',
      ch: 'three-phase',
      title: '三相功率为什么带 √3',
      subtitle: 'Y 接和 Δ 接，为什么能用同一个公式？',
      steps: [
        { eq: 'P = 3·U<sub>p</sub>I<sub>p</sub>cosφ', note: '三相总功率就是三个单相功率之和，φ 是相电压与相电流的夹角。' },
        { eq: 'Y 接：U<sub>p</sub> = ' + F('U<sub>L</sub>', SQ('3')) + '，　I<sub>p</sub> = I<sub>L</sub>', note: '星形连接中，线电压是相电压的 √3 倍，线电流等于相电流。' },
        { eq: 'P = 3·' + F('U<sub>L</sub>', SQ('3')) + '·I<sub>L</sub>cosφ = ' + M(SQ('3') + 'U<sub>L</sub>I<sub>L</sub>cosφ'), note: '代入后 3/√3 约成 √3，这就是三相公式里 √3 的来源。' },
        { eq: 'Δ 接：U<sub>p</sub> = U<sub>L</sub>，　I<sub>p</sub> = ' + F('I<sub>L</sub>', SQ('3')), note: '三角形连接正好反过来：相电压等于线电压，线电流是相电流的 √3 倍。' },
        { eq: 'P = 3·U<sub>L</sub>·' + F('I<sub>L</sub>', SQ('3')) + 'cosφ = ' + M(SQ('3') + 'U<sub>L</sub>I<sub>L</sub>cosφ'), note: '同样得到 √3 的系数。两种接法公式一致，只是线值、相值的含义不同。' }
      ]
    },

    /* ---------------------------------------------------------- */
    {
      id: 'transformer',
      ch: 'coupled',
      title: '理想变压器为什么是 n² 倍',
      subtitle: '阻抗变换里的平方，是从哪一步冒出来的？',
      steps: [
        { eq: 'u<sub>1</sub> = n·u<sub>2</sub>，　i<sub>1</sub> = −' + F('i<sub>2</sub>', 'n'), note: '理想变压器的两个约束：电压按匝比变换，电流按匝比反变换（电流方向均取从同名端流入）。' },
        { eq: 'u<sub>2</sub> = −Z<sub>L</sub>·i<sub>2</sub>', note: '二次侧接负载 Z<sub>L</sub>，负载电流从同名端流出，所以带负号。' },
        { eq: 'Z<sub>in</sub> = ' + F('u<sub>1</sub>', 'i<sub>1</sub>') + ' = ' + F('n·u<sub>2</sub>', '−i<sub>2</sub>/n') + ' = −n<sup>2</sup>·' + F('u<sub>2</sub>', 'i<sub>2</sub>'), note: '把电压、电流约束同时代入输入阻抗的定义。' },
        { eq: '= −n<sup>2</sup>·(−Z<sub>L</sub>) = ' + M('n<sup>2</sup>Z<sub>L</sub>'), note: '两个负号抵消。注意 n² 来自“电压放大 n 倍、电流缩小 n 倍”的叠加效应。' },
        { eq: 'n = ' + F('n<sub>1</sub>', 'n<sub>2</sub>'), note: '匝比越大，从一次侧看进去的阻抗越大——这正是变压器能用来做阻抗匹配的原因。' }
      ]
    },

    /* ---------------------------------------------------------- */
    {
      id: 'resonance',
      ch: 'frequency',
      title: '串联谐振与品质因数',
      subtitle: 'ω₀、Q、通频带三者之间是什么关系？',
      steps: [
        { eq: 'Z = R + j(ωL − ' + F('1', 'ωC') + ')', note: 'RLC 串联的总阻抗：电阻部分与电抗部分（感抗减容抗）。' },
        { eq: '谐振：ωL − ' + F('1', 'ωC') + ' = 0', note: '当电抗为零时，阻抗最小且为纯电阻，电流最大、电压与电流同相。' },
        { eq: 'ω<sub>0</sub> = ' + M(F('1', SQ('LC'))) + '，　f<sub>0</sub> = ' + F('1', '2π' + SQ('LC')), note: '解出谐振角频率，再除以 2π 得到频率。' },
        { eq: 'Q = ' + F('ω<sub>0</sub>L', 'R') + ' = ' + F('1', 'ω<sub>0</sub>CR') + ' = ' + F(SQ('L/C'), 'R'), note: '品质因数衡量“储能与耗能之比”，三种写法互相等价（代入 ω₀L = 1/ω₀C）。' },
        { eq: 'BW = ' + F('ω<sub>0</sub>', 'Q') + ' = ' + M(F('R', 'L')) + '（rad/s）', note: '通频带与 Q 成反比：Q 越高、带宽越窄，选择性越好，但相位变化越陡。' }
      ]
    },

    /* ---------------------------------------------------------- */
    {
      id: 'rms-harmonics',
      ch: 'advanced',
      title: '非正弦有效值为什么是平方和',
      subtitle: '各次谐波为什么不会“相加”而是“平方相加”？',
      steps: [
        { eq: 'i = I<sub>0</sub> + Σ' + SQ('2') + 'I<sub>k</sub>cos(kωt + ψ<sub>k</sub>)', note: '非正弦周期电流展开成傅里叶级数：直流 + 基波 + 各次谐波。' },
        { eq: 'I<sup>2</sup> = ' + F('1', 'T') + '∫<sub>0</sub><sup>T</sup>i<sup>2</sup>dt', note: '有效值的定义是“均方根”：先平方、再平均、最后开方。' },
        { eq: '∫cos(mωt)cos(nωt)dt = 0　(m ≠ n)', note: '不同频率的正弦量在一个周期内正交（乘积的平均为零）——交叉项全部消失。' },
        { eq: 'I<sup>2</sup> = I<sub>0</sub><sup>2</sup> + I<sub>1</sub><sup>2</sup> + I<sub>2</sub><sup>2</sup> + …', note: '剩下的只有各分量自己的平方项，直流分量也按平方计入。' },
        { eq: M('I = ' + SQ('I<sub>0</sub><sup>2</sup> + I<sub>1</sub><sup>2</sup> + I<sub>2</sub><sup>2</sup> + …')), note: '开方即得有效值。同理，平均功率是各次谐波功率之和——不同频率不产生有功。' }
      ]
    }
  ];
})();
