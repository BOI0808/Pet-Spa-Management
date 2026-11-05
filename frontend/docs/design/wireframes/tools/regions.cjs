// Sinh config.json: danh sách ảnh wireframe và vùng đánh số.
// Số vùng (1, 2, …) và chữ khung chung (A, B, …) phải khớp mục tương ứng trong UI-Screens.md.
// Sửa UI demo hoặc UI-Screens thì sửa file này rồi chụp lại.
const fs = require("fs");
const r = (n, sel, i) => (i === undefined ? { n, sel } : { n, sel, i });
const shot = (file, hash, regions, extra = {}) => ({ file, hash, regions, ...extra });
const modal = (file, hash, id, extra = {}) => ({ file, hash, modal: id, regions: [], ...extra });

const shots = [
  // ───────── Web khách hàng ─────────
  shot("CW-khung-chung.png", "cw-03", [
    r("A", "#web-cw .cw-top .brand"), r("B", "#web-cw .topnav"), r("C", "#web-cw .topnav .dd-menu"),
    r("D", "#web-cw .top-right .icon-btn"), r("E", "#web-cw .top-right .user-chip"),
  ], { viewportOnly: true, click: "#web-cw .topnav .dd .navbtn" }),
  shot("CW-01-dang-ky.png", "cw-01", [r(1, "#cw-01 .auth-art"), r(2, "#cw-01 .af-in .stack")]),
  shot("CW-02-dang-nhap.png", "cw-02~c", [r(1, "#cw-02 .auth-art"), r(2, "#cw-02 .af-in .alert"), r(3, "#cw-02 .af-in .stack")]),
  shot("CW-03-trang-chu.png", "cw-03", [
    r(1, "#cw-03 .hero > div", 0), r(2, "#cw-03 .hero-next"), r(3, "#cw-03 .section-title .seg"),
    r(4, "#cw-03 > .card"), r(5, "#cw-03 .g2 > div:first-child .card"), r(6, "#cw-03 .g2 > div:last-child"),
    r(7, "#cw-03 > .row.small"),
  ]),
  shot("CW-04-thu-cung.png", "cw-04~a", [
    r(1, "#cw-04 .page-head"), r(2, "#cw-04 .g3 > .card", 0), r(3, "#cw-04 .g3 > a.card"), r(4, "#cw-04 .alert-info"),
  ]),
  shot("CW-04-thu-cung-rong.png", "cw-04~b", [r(5, "#cw-04 .empty")]),
  modal("CW-04-d1-go-ho-so.png", "cw-04~a", "m-remove-pet"),
  shot("CW-05-ho-so-thu-cung.png", "cw-05~moi", [
    r(1, "#cw-05 .page-head"), r(2, "#cw-05 .card-body > .field", 0), r(3, "#cw-05 .card-body > .form-grid", 0),
    r(4, "#cw-05 .card-body > .field", 1), r(5, "#cw-05 .card-body > .form-grid", 1), r(6, "#cw-05 .split > .card .card-foot"),
    r(7, "#cw-05 aside.summary"),
  ]),
  shot("CW-06-dat-lich-spa-b1.png", "cw-06~b1", [
    r(1, "#cw-06 .stepper"), r(2, "#cw-06 .split > .stack > .card", 0), r(3, "#cw-06 .split > .stack > .card", 1),
    r(4, "#cw-06 aside.summary"),
  ]),
  shot("CW-06-dat-lich-spa-b2.png", "cw-06~b2", [
    r(1, "#cw-06 .stepper"), r(5, "#cw-06 .split > .stack > .card", 0), r(6, "#cw-06 .split > .stack > .card", 1),
    r(4, "#cw-06 aside.summary"),
  ]),
  shot("CW-06-dat-lich-spa-b3.png", "cw-06~b3", [
    r(1, "#cw-06 .stepper"), r(7, "#cw-06 .split > .stack > .card", 0), r(8, "#cw-06 .split > .stack > .card", 1),
    r(4, "#cw-06 aside.summary"),
  ]),
  shot("CW-06-dat-lich-spa-bi-khoa.png", "cw-06~khoa", [r(9, "#cw-06 .split > .stack > .alert-danger"), r(4, "#cw-06 aside.summary .card-foot")]),
  shot("CW-07-dat-lich-luu-tru.png", "cw-07~con", [
    r(1, "#cw-07 .page-head"), r(2, "#cw-07 .split > .stack > .card", 0), r(3, "#cw-07 .split > .stack > .card", 1),
    r(4, "#cw-07 .split > .stack > .alert"), r(5, "#cw-07 aside.summary"),
  ]),
  shot("CW-08-lich-hen.png", "cw-08", [
    r(1, "#cw-08 .page-head"), r(2, "#cw-08 .tabs"), r(3, "#cw-08 .row.mb-16"), r(4, "#cw-08 .stack-12", 0),
  ]),
  shot("CW-09-chi-tiet-can-xac-nhan.png", "cw-09~can", [
    r(1, "#cw-09 > .row.mb-24"), r(2, "#cw-09 > .card.card-pad", 0), r(3, "#cw-09 .cost-banner"),
    r(4, "#cw-09 .split > .stack > .card", 0), r(5, "#cw-09 .split > .stack > .card", 1),
    r(6, "#cw-09 .split > aside > .card", 0), r(7, "#cw-09 .split > aside > .card", 1), r(8, "#cw-09 .split > aside > .card", 2),
  ]),
  shot("CW-09-chi-tiet-hoan-tat.png", "cw-09~xong", [
    r(1, "#cw-09 > .row.mb-24"), r(2, "#cw-09 > .card.card-pad", 0), r(4, "#cw-09 .split > .stack > .card", 0),
    r(5, "#cw-09 .split > .stack > .card", 1), r(6, "#cw-09 .split > aside > .card", 0), r(7, "#cw-09 .split > aside > .card", 1),
  ]),
  shot("CW-09-chi-tiet-luu-tru.png", "cw-09~luutru", [
    r(1, "#cw-09 > .row.mb-24"), r(2, "#cw-09 > .card.card-pad", 0), r(4, "#cw-09 .split > .stack > .card", 0),
    r(6, "#cw-09 .split > aside > .card", 0), r(7, "#cw-09 .split > aside > .card", 1), r(8, "#cw-09 .split > aside > .card", 2),
  ]),
  shot("CW-09-ket-qua-thanh-toan.png", "cw-09~tt-loi", [r(9, "#cw-09 > .card.card-pad", 0), r(7, "#cw-09 .split > aside > .card", 1)]),
  modal("CW-09-d1-huy-lich.png", "cw-09~cho", "m-cancel"),
  modal("CW-09-d2-tu-choi-chi-phi.png", "cw-09~can", "m-cost-reject"),
  modal("CW-09-d3-thanh-toan-truc-tuyen.png", "cw-09~xong", "m-pay"),
  shot("CW-10-doi-lich-spa.png", "cw-10~spa", [
    r(1, "#cw-10 .page-head"), r(2, "#cw-10 .split > .stack > .surface-soft"), r(3, "#cw-10 .split > .stack > .card", 0),
    r(4, "#cw-10 .split > .stack > .card", 1), r(5, "#cw-10 aside.summary"),
  ]),
  shot("CW-10-doi-lich-luu-tru.png", "cw-10~ht", [
    r(2, "#cw-10 .split > .stack > .surface-soft"), r(6, "#cw-10 .split > .stack > .card", 0), r(5, "#cw-10 aside.summary"),
  ]),
  shot("CW-11-lich-su.png", "cw-11", [r(1, "#cw-11 .page-head"), r(2, "#cw-11 .stack-12 > .card", 0), r(3, "#cw-11 .stack-12 > .card", 1)]),
  shot("CW-12-thong-bao.png", "cw-12", [r(1, "#cw-12 .page-head"), r(2, "#cw-12 .tabs"), r(3, "#cw-12 .notif", 0), r(4, "#cw-12 .notif", 2)]),
  shot("CW-13-ho-so.png", "cw-13~a", [r(1, "#cw-13 .split > .card"), r(2, "#cw-13 aside .card"), r(3, "#cw-13 aside .btn-quiet")]),

  // ───────── Web nhân viên ─────────
  shot("SW-khung-chung-le-tan.png", "sw-02~lt", [
    r("A", "#web-sw .sw-top .brand"), r("B", "#web-sw .sw-nav"), r("D", "#web-sw .top-right .user-chip"),
  ], { viewportOnly: true }),
  shot("SW-khung-chung-nhan-vien-spa.png", "sw-02~nvs", [
    r("A", "#web-sw .sw-top .brand"), r("B", "#web-sw .sw-nav"), r("C", "#web-sw .top-right .icon-btn"), r("D", "#web-sw .top-right .user-chip"),
  ], { viewportOnly: true }),
  shot("SW-01-dang-nhap.png", "sw-01~b", [r(1, "#sw-01 .auth-art"), r(2, "#sw-01 .af-in .alert"), r(3, "#sw-01 .af-in .stack")]),
  shot("SW-02-lich-hen-le-tan.png", "sw-02~lt", [
    r(1, "#sw-02 [data-role=lt] .page-head"), r(2, "#sw-02 [data-role=lt] .row.mb-16"), r(3, "#sw-02 [data-role=lt] .card"),
  ]),
  shot("SW-02-lich-hen-nhan-vien-spa.png", "sw-02~nvs", [
    r(4, "#sw-02 [data-role=nvs] .page-head"), r(5, "#sw-02 [data-role=nvs] .stack-12", 0), r(6, "#sw-02 [data-role=nvs] .stack-12", 1),
  ]),
  shot("SW-03-chi-tiet-le-tan.png", "sw-03", [
    r(1, "#sw-03 > .row.mb-24"), r(2, "#sw-03 > .card.card-pad"), r(3, "#sw-03 .split > .stack > .card", 0),
    r(4, "#sw-03 .split > .stack > .card", 1), r(5, "#sw-03 .split > aside > .card", 0), r(6, "#sw-03 .split > aside > .card", 1),
    r(7, "#sw-03 .split > aside > .card", 2),
  ], { role: "lt" }),
  shot("SW-03-chi-tiet-nhan-vien-spa.png", "sw-03", [r(1, "#sw-03 > .row.mb-24"), r(3, "#sw-03 .split > .stack > .card", 0)], { role: "nvs" }),
  shot("SW-04-khach-hang-tim-thay.png", "sw-04~tim", [r(1, "#sw-04 > .card.card-pad"), r(2, "#sw-04 [data-vn=tim] .card")]),
  shot("SW-04-khach-hang-vang-lai.png", "sw-04~moi", [r(1, "#sw-04 > .card.card-pad"), r(3, "#sw-04 [data-vn=moi] .alert"), r(4, "#sw-04 [data-vn=moi] .card")]),
  shot("SW-05-ho-so-thu-cung.png", "sw-05~moi", [
    r(1, "#sw-05 > .surface-soft"), r(2, "#sw-05 .card-body > .field", 0), r(3, "#sw-05 .card-body > .form-grid", 0),
    r(4, "#sw-05 .card-body > .field", 1), r(5, "#sw-05 .card-body > .form-grid", 1), r(6, "#sw-05 .split > .card .card-foot"),
    r(7, "#sw-05 aside.summary"),
  ]),
  shot("SW-06-dat-lich-thay-spa.png", "sw-06~spa", [
    r(1, "#sw-06 > .surface-soft"), r(2, "#sw-06 .tabs"), r(3, "#sw-06 .split > .stack > .card", 0),
    r(4, "#sw-06 .split > .stack > .card", 1), r(5, "#sw-06 .split > .stack > .card", 2), r(6, "#sw-06 .split > .stack > .alert"),
    r(7, "#sw-06 aside.summary"),
  ]),
  shot("SW-06-dat-lich-thay-luu-tru.png", "sw-06~ht", [r(2, "#sw-06 .tabs"), r(8, "#sw-06 .split > .stack > .card", 1), r(7, "#sw-06 aside.summary")]),
  shot("SW-07-tiep-nhan-nhap-can.png", "sw-07~nhap", [
    r(1, "#sw-07 .split-list > .card", 0), r(2, "#sw-07 .split-list .card-head", 1), r(3, "#sw-07 .split-list .g3"),
    r(4, "#sw-07 .split-list .field", 0), r(5, "#sw-07 .split-list .grow[data-vn=nhap]"), r(6, "#sw-07 .split-list .card-foot"),
  ]),
  shot("SW-07-tiep-nhan-cho-xac-nhan.png", "sw-07~can", [r(4, "#sw-07 .split-list .field", 0), r(7, "#sw-07 .split-list .alert-warn"), r(6, "#sw-07 .split-list .card-foot")]),
  shot("SW-07-tiep-nhan-luu-tru.png", "sw-07~luutru", [
    r(8, "#sw-07 .split-list .card-head", 1), r(9, "#sw-07 .split-list .svc-task", 0), r(10, "#sw-07 .split-list .svc-task", 1),
    r(11, "#sw-07 .split-list .svc-task", 2), r(6, "#sw-07 .split-list .card-foot"),
  ]),
  modal("SW-07-d1-ghi-nhan-phan-hoi.png", "sw-07~can", "m-cost-record"),
  shot("SW-08-chuong.png", "sw-08", [r(1, "#sw-08 .page-head"), r(2, "#sw-08 > .row.mb-16"), r(3, "#sw-08 .cage-grid"), r(4, "#sw-08 .cage.busy", 1)]),
  shot("SW-09-thanh-toan-tien-mat.png", "sw-09~cash", [
    r(1, "#sw-09 .split-list > .card", 0), r(2, "#sw-09 .split-list .card-head", 1), r(3, "#sw-09 .split-list .surface-soft", 0),
    r(4, "#sw-09 .split-list .card-body > .row.row-between"), r(5, "#sw-09 .split-list .seg"), r(6, "#sw-09 .split-list .form-grid", 0),
    r(7, "#sw-09 .split-list .card-foot"),
  ]),
  shot("SW-09-thanh-toan-qr.png", "sw-09~qr", [r(5, "#sw-09 .split-list .seg"), r(8, "#sw-09 .split-list .row.row-top.gap-20")]),
  shot("SW-10-tra-thu-cung.png", "sw-10~tre", [
    r(1, "#sw-10 .split > .stack > .card .card-head"), r(2, "#sw-10 .split .g3"), r(3, "#sw-10 .split .form-grid"),
    r(4, "#sw-10 .split > .stack .alert"), r(5, "#sw-10 .split > aside > .card", 0), r(6, "#sw-10 .split > aside > .card", 1),
  ]),
  shot("SW-11-thuc-hien-chua-du-dieu-kien.png", "sw-11~chan", [
    r(1, "#sw-11 > .row.mb-16"), r(2, "#sw-11 > .alert"), r(3, "#sw-11 .split-wide .g2 > .card", 0), r(4, "#sw-11 .split-wide .g2 > .card", 1),
    r(5, "#sw-11 .split-wide > .card .card-head"), r(6, "#sw-11 .split-wide > .card .alert-warn"), r(7, "#sw-11 .split-wide > .card .card-foot"),
  ]),
  shot("SW-11-thuc-hien-dang-lam.png", "sw-11~dang", [
    r(3, "#sw-11 .split-wide .g2 > .card", 0), r(4, "#sw-11 .split-wide .g2 > .card", 1), r(8, "#sw-11 .split-wide > .card .svc-task", 1),
    r(7, "#sw-11 .split-wide > .card .card-foot"),
  ]),
  shot("SW-12-lich-su-cong-viec.png", "sw-12", [r(1, "#sw-12 .page-head"), r(2, "#sw-12 .table-wrap"), r(3, "#sw-12 .table-foot")]),
  shot("SW-13-thong-bao.png", "sw-13", [r(1, "#sw-13 .page-head"), r(2, "#sw-13 .notif", 0), r(3, "#sw-13 .notif", 3)]),
  shot("SW-14-dich-vu.png", "sw-14", [r(1, "#sw-14 .page-head"), r(2, "#sw-14 > .card")]),
  shot("SW-15-ho-so.png", "sw-15", [r(1, "#sw-15 .split > .card"), r(2, "#sw-15 aside .card"), r(3, "#sw-15 aside .btn-quiet")], { role: "lt" }),

  // ───────── Web quản lý ─────────
  shot("MW-khung-chung.png", "mw-02", [
    r("A", "#web-mw .mw-side .brand"), r("B", "#web-mw .side-nav"), r("C", "#web-mw .side-nav .count"), r("D", "#web-mw .side-user"),
  ], { viewportOnly: true }),
  shot("MW-01-dang-nhap.png", "mw-01~b", [r(1, "#mw-01 .auth-art"), r(2, "#mw-01 .af-in .alert"), r(3, "#mw-01 .af-in .stack")]),
  shot("MW-02-tong-quan.png", "mw-02", [
    r(1, "#mw-02 .page-head"), r(2, "#mw-02 .g4"), r(3, "#mw-02 .split-wide > .card"),
    r(4, "#mw-02 .split-wide > .stack > .card", 0), r(5, "#mw-02 .split-wide > .stack > .card", 1),
  ]),
  shot("MW-03-lich-hen.png", "mw-03", [r(1, "#mw-03 .filters"), r(2, "#mw-03 .table-wrap"), r(3, "#mw-03 .table-foot")]),
  shot("MW-04-cho-xac-nhan-spa.png", "mw-04~mochi", [
    r(1, "#mw-04 .page-head"), r(2, "#mw-04 .split-list > .stack-8"), r(3, "#mw-04 .split-list > .card .card-head"),
    r(4, "#mw-04 .split-list > .card .g3"), r(5, "#mw-04 .split-list > .card .card-body > div:not(.g3):not(.alert)"),
    r(6, "#mw-04 .split-list > .card .card-foot"),
  ]),
  shot("MW-04-cho-xac-nhan-phan-cong-lai.png", "mw-04~lu", [
    r(3, "#mw-04 .split-list > .card .card-head"), r(7, "#mw-04 .split-list > .card .card-body > .alert"),
    r(5, "#mw-04 .split-list > .card .card-body > div:not(.g3):not(.alert)"), r(6, "#mw-04 .split-list > .card .card-foot"),
  ]),
  shot("MW-04-cho-xac-nhan-luu-tru.png", "mw-04~may", [
    r(3, "#mw-04 .split-list > .card .card-head"), r(4, "#mw-04 .split-list > .card .g3"),
    r(8, "#mw-04 .split-list > .card .card-body > div:not(.g3):not(.alert)"), r(6, "#mw-04 .split-list > .card .card-foot"),
  ]),
  modal("MW-04-d1-tu-choi.png", "mw-04~mochi", "m-reject"),
  shot("MW-05-chi-tiet-spa.png", "mw-05~spa", [
    r(1, "#mw-05 > .row.mb-24"), r(2, "#mw-05 > .card.card-pad"), r(3, "#mw-05 .split > .stack > .card", 0),
    r(4, "#mw-05 .split > .stack > .card", 1), r(5, "#mw-05 .split > .stack > .card", 2), r(6, "#mw-05 .split > .stack > .card", 3),
    r(7, "#mw-05 .split > aside > .card", 0), r(8, "#mw-05 .split > aside > .card", 1), r(9, "#mw-05 .split > aside > .card", 2),
  ]),
  shot("MW-05-chi-tiet-luu-tru.png", "mw-05~luutru", [
    r(1, "#mw-05 > .row.mb-24"), r(10, "#mw-05 .split > .stack > .card", 0), r(6, "#mw-05 .split > .stack > .card", 1),
    r(7, "#mw-05 .split > aside > .card", 0), r(8, "#mw-05 .split > aside > .card", 1),
  ]),
  modal("MW-05-d1-doi-lich-spa.png", "mw-05~spa", "m-mgr-change"),
  modal("MW-05-d2-doi-lich-luu-tru.png", "mw-05~luutru", "m-mgr-change-ht"),
  modal("MW-05-d3-huy-lich.png", "mw-05~spa", "m-mgr-cancel"),
  shot("MW-06-dich-vu.png", "mw-06", [r(1, "#mw-06 .page-head"), r(2, "#mw-06 > .card"), r(3, "#mw-06 > p")]),
  modal("MW-06-d1-dich-vu.png", "mw-06", "d-service"),
  modal("MW-06-d2-ngung-dich-vu.png", "mw-06", "m-stop-svc"),
  shot("MW-07-chuong.png", "mw-07~chuong", [r(1, "#mw-07 .page-head"), r(2, "#mw-07 .tabs"), r(3, "#mw-07 .g4"), r(4, "#mw-07 [data-vn=chuong] .card")]),
  shot("MW-07-gia-luu-tru.png", "mw-07~gia", [
    r(1, "#mw-07 .page-head"), r(2, "#mw-07 .tabs"), r(5, "#mw-07 [data-vn=gia] .split > .card"), r(6, "#mw-07 [data-vn=gia] .split > .stack > .card"),
  ]),
  modal("MW-07-d1-chuong.png", "mw-07~chuong", "m-cage"),
  shot("MW-08-nhan-vien.png", "mw-08", [r(1, "#mw-08 .page-head"), r(2, "#mw-08 > .row"), r(3, "#mw-08 > .card"), r(4, "#mw-08 > p")]),
  modal("MW-08-d1-nhan-vien.png", "mw-08", "d-staff"),
  modal("MW-08-d2-vo-hieu-hoa.png", "mw-08", "m-deactivate"),
  shot("MW-09-khach-bi-khoa.png", "mw-09", [r(1, "#mw-09 .page-head"), r(2, "#mw-09 > .card"), r(3, "#mw-09 > .alert")]),
  modal("MW-09-d1-go-khoa.png", "mw-09", "m-unlock"),
  shot("MW-10-thanh-toan.png", "mw-10", [r(1, "#mw-10 .g4"), r(2, "#mw-10 .filters"), r(3, "#mw-10 .table-wrap"), r(4, "#mw-10 .table-foot")]),
  modal("MW-10-d1-thanh-toan-quay.png", "mw-10", "m-counter"),
  shot("MW-11-ho-so.png", "mw-11", [r(1, "#mw-11 .split > .card"), r(2, "#mw-11 aside .card"), r(3, "#mw-11 aside .btn-quiet")]),
  shot("MW-12-lich-lam-viec.png", "mw-12~xem", [r(1, "#mw-12 .page-head"), r(2, "#mw-12 .stack > .card", 0), r(3, "#mw-12 .stack > .card", 1)]),
  shot("MW-12-sua-ca-loi.png", "mw-12~loi", [r(2, "#mw-12 .stack > .card", 0), r(4, "#mw-12 .stack > .card", 1), r(5, "#mw-12 .alert-warn")]),
  shot("MW-13-cau-hinh-dat-lich.png", "mw-13~datlich", [
    r(1, "#mw-13 .split > .card"), r(2, "#mw-13 .split > div > .card", 0), r(3, "#mw-13 .field.span-2"), r(4, "#mw-13 .split > div .card-foot", 0),
  ]),
  shot("MW-13-cau-hinh-can-nang.png", "mw-13~cannang", [
    r(1, "#mw-13 .split > .card"), r(5, "#mw-13 [data-vn=cannang] > .card", 0), r(6, "#mw-13 [data-vn=cannang] > .card", 1),
    r(7, "#mw-13 [data-vn=cannang] > .card", 2),
  ]),
];

fs.writeFileSync("config.json", JSON.stringify({ demo: "../../../SE358_PetSpa_UI_Demo.html", shots }, null, 1));
console.log(shots.length + " ảnh");
